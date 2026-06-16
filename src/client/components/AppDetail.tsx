import React, { useEffect, useState } from "react";
import { display, value, countMessagesBySender } from "../utils/fields.ts";
import { formatImplDuration, getImplMinutes } from "../utils/workingDuration.ts";
import { fetchConversations, fetchMessages, fetchCheckpoints, fetchAppNames, fetchAppComposition, fetchSettings, saveSettings } from "../services/api.ts";
import type { AppComposition, ComponentItem } from "../services/api.ts";
import { analyzeConversation, aggregateApplicationUsage, formatEstimate, formatTokenCount } from "../utils/tokenEstimation.ts";
import type { ConversationTokenUsage, ApplicationTokenUsage } from "../utils/tokenEstimation.ts";
import {
  calculateComplexity,
  complexityLabel,
  calculateManualHours,
  calculateROI,
  DEFAULT_WEIGHTS,
  DEFAULT_PARTNER_ESTIMATES,
} from "../utils/complexity.ts";
import type { ComplexityWeights, PartnerEstimates, ROIResult } from "../utils/complexity.ts";
import KpiCard from "./KpiCard.tsx";
import DataTable from "./DataTable.tsx";

interface AppDetailProps {
  appId: string;
  onNavigate: (view: string, id?: string) => void;
}

interface ConvoWithCounts {
  raw: any;
  userMessages: number;
  assistantMessages: number;
  totalMessages: number;
  checkpoints: number;
  tokenUsage: ConversationTokenUsage;
}

const NOWASSIST_UNIT_COST = 25;

/** Sub-component that renders a composition category tile (click opens modal) */
function CompositionTile({ icon, label, items, onOpen }: { icon: string; label: string; items: ComponentItem[]; onOpen: () => void }) {
  const count = items.length;

  return (
    <div className={`ba-composition-item ${count > 0 ? "ba-composition-item--has-items" : ""}`}>
      <button
        className="ba-composition-item__header"
        onClick={() => count > 0 && onOpen()}
        type="button"
        disabled={count === 0}
      >
        <span className="ba-composition-item__icon">{icon}</span>
        <span className="ba-composition-item__value">{count}</span>
        <span className="ba-composition-item__label">{label}</span>
        {count > 0 && <span className="ba-composition-item__chevron">▸</span>}
      </button>
    </div>
  );
}

/** Modal that shows the list of items for a composition category */
function CompositionModal({ icon, label, items, onClose }: { icon: string; label: string; items: ComponentItem[]; onClose: () => void }) {
  // Close on Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="ba-modal-overlay" onClick={onClose}>
      <div className="ba-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ba-modal__header">
          <span className="ba-modal__header-icon">{icon}</span>
          <span className="ba-modal__title">{label}</span>
          <span className="ba-modal__count">{items.length}</span>
          <button className="ba-modal__close" onClick={onClose} type="button" title="Close">✕</button>
        </div>
        <div className="ba-modal__body">
          <ul className="ba-modal__list">
            {items.map((item) => (
              <li key={item.sysId} className="ba-modal__list-item">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ba-modal__link"
                  title={`Open: ${item.name}`}
                >
                  <span className="ba-modal__link-name">{item.name}</span>
                  <span className="ba-modal__link-icon">↗</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/** Modal settings editor for weights or estimates */
function SettingsEditor({
  title,
  values,
  labels,
  onSave,
  onCancel,
}: {
  title: string;
  values: Record<string, number>;
  labels: Record<string, string>;
  onSave: (vals: Record<string, number>) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Record<string, number>>({ ...values });

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onCancel]);

  function handleChange(key: string, val: string) {
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 0) {
      setDraft((prev) => ({ ...prev, [key]: num }));
    }
  }

  return (
    <div className="ba-modal-overlay" onClick={onCancel}>
      <div className="ba-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ba-settings-modal__header">
          <span className="ba-settings-modal__icon">⚙️</span>
          <span className="ba-settings-modal__title">{title}</span>
          <button className="ba-modal__close" onClick={onCancel} type="button" title="Close">✕</button>
        </div>
        <div className="ba-settings-modal__body">
          {Object.keys(values).map((key) => (
            <div className="ba-settings-modal__row" key={key}>
              <span className="ba-settings-modal__label">{labels[key] || key}</span>
              <input
                className="ba-settings-modal__input"
                type="number"
                min="0"
                value={draft[key]}
                onChange={(e) => handleChange(key, e.target.value)}
              />
            </div>
          ))}
        </div>
        <div className="ba-settings-modal__footer">
          <button className="ba-settings-modal__cancel" onClick={onCancel} type="button">Cancel</button>
          <button className="ba-settings-modal__save" onClick={() => onSave(draft)} type="button">Save</button>
        </div>
      </div>
    </div>
  );
}

const COMPONENT_LABELS: Record<string, string> = {
  tables: "Tables",
  uiPages: "UI Pages",
  workspaces: "Workspaces",
  portals: "Portals",
  widgets: "Widgets",
  flows: "Flows",
};

export default function AppDetail({ appId, onNavigate }: AppDetailProps) {
  const [appName, setAppName] = useState("");
  const [convoData, setConvoData] = useState<ConvoWithCounts[]>([]);
  const [totalUser, setTotalUser] = useState(0);
  const [totalAssistant, setTotalAssistant] = useState(0);
  const [totalCheckpoints, setTotalCheckpoints] = useState(0);
  const [implDuration, setImplDuration] = useState("");
  const [implMinutes, setImplMinutes] = useState(0);
  const [appTokenUsage, setAppTokenUsage] = useState<ApplicationTokenUsage | null>(null);
  const [loading, setLoading] = useState(true);

  // App composition scan state
  const [composition, setComposition] = useState<AppComposition | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");

  // Composition modal state
  const [modalData, setModalData] = useState<{ icon: string; label: string; items: ComponentItem[] } | null>(null);

  // Complexity & ROI state
  const [weights, setWeights] = useState<ComplexityWeights>(DEFAULT_WEIGHTS);
  const [estimates, setEstimates] = useState<PartnerEstimates>(DEFAULT_PARTNER_ESTIMATES);
  const [editingWeights, setEditingWeights] = useState(false);
  const [editingEstimates, setEditingEstimates] = useState(false);
  const [roiOpen, setRoiOpen] = useState(false);

  useEffect(() => {
    loadData();
    loadUserSettings();
  }, [appId]);

  async function loadUserSettings() {
    try {
      const savedWeights = await fetchSettings("complexity_weights");
      if (savedWeights) setWeights(savedWeights);
      const savedEstimates = await fetchSettings("partner_estimates");
      if (savedEstimates) setEstimates(savedEstimates);
    } catch (e) {
      // Use defaults if settings fetch fails
    }
  }

  async function loadData() {
    try {
      const convos = await fetchConversations(
        `application_id=${appId}^ORDERBYDESClast_message_at`
      );

      // Resolve app name
      let resolvedName = "";
      if (convos.length > 0) {
        resolvedName = display(convos[0].application_name);
      }
      if (!resolvedName) {
        const nameMap = await fetchAppNames([appId]);
        resolvedName = nameMap.get(appId) || `App (${appId.substring(0, 8)}...)`;
      }
      setAppName(resolvedName);

      // Fetch messages and checkpoints per conversation
      let userTotal = 0;
      let assistantTotal = 0;
      let chkTotal = 0;
      const convoResults: ConvoWithCounts[] = [];
      const convoTokenUsages: ConversationTokenUsage[] = [];
      const allConvoMessages: any[][] = [];

      for (const c of convos) {
        const cId = value(c.sys_id);
        const [msgs, chks] = await Promise.all([
          fetchMessages(cId),
          fetchCheckpoints(cId),
        ]);
        const counts = countMessagesBySender(msgs);
        userTotal += counts.user;
        assistantTotal += counts.assistant;
        chkTotal += chks.length;

        // Compute token usage for this conversation
        const tokenUsage = analyzeConversation(msgs);
        convoTokenUsages.push(tokenUsage);

        // Store messages for duration calculation
        allConvoMessages.push(msgs);

        convoResults.push({
          raw: c,
          userMessages: counts.user,
          assistantMessages: counts.assistant,
          totalMessages: counts.total,
          checkpoints: chks.length,
          tokenUsage,
        });
      }

      setTotalUser(userTotal);
      setTotalAssistant(assistantTotal);
      setTotalCheckpoints(chkTotal);
      setConvoData(convoResults);

      // Aggregate application-level token usage
      const appUsage = aggregateApplicationUsage(convoTokenUsages);
      setAppTokenUsage(appUsage);

      // Calculate implementation duration from user message intervals
      const duration = formatImplDuration(allConvoMessages);
      setImplDuration(duration);

      // Calculate raw minutes for ROI
      const minutes = getImplMinutes(allConvoMessages);
      setImplMinutes(minutes);
    } catch (e) {
      console.error("AppDetail load error:", e);
    } finally {
      setLoading(false);
    }
  }

  async function scanApplication() {
    setScanning(true);
    setScanError("");
    try {
      const result = await fetchAppComposition(appId);
      setComposition(result);
    } catch (e: any) {
      console.error("Scan error:", e);
      setScanError("Failed to scan application. Please try again.");
    } finally {
      setScanning(false);
    }
  }

  async function handleSaveWeights(vals: Record<string, number>) {
    const newWeights = vals as unknown as ComplexityWeights;
    setWeights(newWeights);
    setEditingWeights(false);
    try {
      await saveSettings("complexity_weights", newWeights);
    } catch (e) {
      console.error("Failed to save weights:", e);
    }
  }

  async function handleSaveEstimates(vals: Record<string, number>) {
    const newEstimates = vals as unknown as PartnerEstimates;
    setEstimates(newEstimates);
    setEditingEstimates(false);
    try {
      await saveSettings("partner_estimates", newEstimates);
    } catch (e) {
      console.error("Failed to save estimates:", e);
    }
  }

  if (loading) return <div className="ba-loading">Loading app details...</div>;

  const nowAssistUnits = totalUser * NOWASSIST_UNIT_COST;

  // Build token breakdown tooltip (same style as NowAssist Units)
  const tokenTooltip = appTokenUsage && appTokenUsage.total > 0
    ? `input: ~${formatTokenCount(appTokenUsage.input)} · output: ~${formatTokenCount(appTokenUsage.output)} · thinking: ~${formatTokenCount(appTokenUsage.thinking)}`
    : undefined;

  // Complexity & ROI calculations
  const complexScore = composition ? calculateComplexity(composition, weights) : 0;
  const complexLabel = complexityLabel(complexScore);
  const manualHours = composition ? calculateManualHours(composition, estimates) : 0;
  const roi: ROIResult | null = composition && implMinutes > 0
    ? calculateROI(manualHours, implMinutes)
    : null;

  const columns = [
    { key: "title", label: "Conversation", render: (r: ConvoWithCounts) => display(r.raw.title) || "Untitled" },
    { key: "userMessages", label: "User Msgs", render: (r: ConvoWithCounts) => r.userMessages },
    { key: "assistantMessages", label: "Assistant Msgs", render: (r: ConvoWithCounts) => r.assistantMessages },
    { key: "tokens", label: "Est. Tokens", render: (r: ConvoWithCounts) => `~${formatTokenCount(r.tokenUsage.total)}` },
    { key: "checkpoints", label: "Checkpoints", render: (r: ConvoWithCounts) => r.checkpoints },
    { key: "state", label: "State", render: (r: ConvoWithCounts) => display(r.raw.state) },
    { key: "date", label: "Last Activity", render: (r: ConvoWithCounts) => display(r.raw.last_message_at) },
  ];

  return (
    <div className="ba-view">
      <button
        className="ba-back-btn"
        onClick={() => onNavigate("applications")}
        type="button"
      >
        ← Back to Applications
      </button>
      <h1 className="ba-view__title">{appName}</h1>
      <p className="ba-view__subtitle">
        {convoData.length} conversation{convoData.length !== 1 ? "s" : ""} over time
      </p>
      <div className="ba-kpi-row">
        <KpiCard title="User Messages" value={totalUser} icon="user" />
        <KpiCard title="Assistant Messages" value={totalAssistant} icon="assistant" />
        <KpiCard
          title="Tokens"
          value={appTokenUsage ? formatEstimate(appTokenUsage.total) : "—"}
          icon="tokens"
          tooltip={tokenTooltip}
        />
        <KpiCard title="Impl. Duration" value={implDuration || "—"} icon="duration" />
        <KpiCard
          title="NowAssist Units"
          value={nowAssistUnits.toLocaleString("de-DE")}
          icon="cost"
          tooltip={`${totalUser} user messages × ${NOWASSIST_UNIT_COST} NowAssist units = ${nowAssistUnits.toLocaleString("de-DE")}`}
        />
      </div>

      {/* Application Composition Scan */}
      <div className="ba-section">
        <div className="ba-section__header">
          <h2 className="ba-section__title">Application Composition</h2>
          <button
            className="ba-scan-btn"
            onClick={scanApplication}
            disabled={scanning}
            type="button"
          >
            {scanning ? "Scanning..." : composition ? "Rescan" : "Scan Application"}
          </button>
        </div>
        {scanError && <p className="ba-scan-error">{scanError}</p>}
        {composition && (
          <div className="ba-composition-grid">
            <CompositionTile icon="🗃️" label="Tables" items={composition.tables} onOpen={() => setModalData({ icon: "🗃️", label: "Tables", items: composition.tables })} />
            <CompositionTile icon="📄" label="UI Pages" items={composition.uiPages} onOpen={() => setModalData({ icon: "📄", label: "UI Pages", items: composition.uiPages })} />
            <CompositionTile icon="🖥️" label="Workspaces" items={composition.workspaces} onOpen={() => setModalData({ icon: "🖥️", label: "Workspaces", items: composition.workspaces })} />
            <CompositionTile icon="🌐" label="Portals" items={composition.portals} onOpen={() => setModalData({ icon: "🌐", label: "Portals", items: composition.portals })} />
            <CompositionTile icon="🧩" label="Widgets" items={composition.widgets} onOpen={() => setModalData({ icon: "🧩", label: "Widgets", items: composition.widgets })} />
            <CompositionTile icon="⚡" label="Flows" items={composition.flows} onOpen={() => setModalData({ icon: "⚡", label: "Flows", items: composition.flows })} />
          </div>
        )}
        {!composition && !scanning && (
          <p className="ba-scan-hint">
            Click "Scan Application" to analyze the internal components of this app and understand its complexity.
          </p>
        )}
      </div>

      {/* Complexity Score Panel */}
      {composition && (
        <div className="ba-complexity">
          <div className="ba-complexity__header">
            <span className="ba-complexity__score" style={{ color: complexLabel.color }}>{complexScore}</span>
            <div>
              <span className="ba-complexity__label" style={{ color: complexLabel.color }}>{complexLabel.label}</span>
            </div>
            <button
              className="ba-scan-btn"
              onClick={() => setEditingWeights(!editingWeights)}
              type="button"
              style={{ marginLeft: "auto", fontSize: "0.75rem", padding: "0.375rem 1rem" }}
            >
              {editingWeights ? "Cancel" : "Edit Weights"}
            </button>
          </div>
          {editingWeights && (
            <SettingsEditor
              title="Complexity Weights"
              values={weights as unknown as Record<string, number>}
              labels={COMPONENT_LABELS}
              onSave={handleSaveWeights}
              onCancel={() => setEditingWeights(false)}
            />
          )}
          <div className="ba-complexity__breakdown">
            {(Object.keys(COMPONENT_LABELS) as Array<keyof ComplexityWeights>).map((key) => {
              const count = composition[key].length;
              const weight = weights[key];
              const subtotal = count * weight;
              if (count === 0) return null;
              return (
                <div className="ba-complexity__row" key={key}>
                  <span>{count} {COMPONENT_LABELS[key]} × {weight}</span>
                  <span style={{ fontWeight: 700 }}>{subtotal}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ROI / Savings Panel — Collapsible */}
      {composition && roi && (
        <div className={`ba-roi ${roiOpen ? "ba-roi--open" : ""}`}>
          <button
            className="ba-roi__toggle"
            onClick={() => setRoiOpen(!roiOpen)}
            type="button"
          >
            <span className="ba-roi__toggle-icon">{roiOpen ? "▾" : "▸"}</span>
            <span className="ba-roi__title">💰 ROI — Build Agent Savings</span>
            <span className="ba-roi__toggle-preview">
              {roi.savedHours.toFixed(1)}h saved · {roi.savingsPercent.toFixed(0)}%
            </span>
          </button>
          {roiOpen && (
            <div className="ba-roi__body">
              <div className="ba-roi__header">
                <button
                  className="ba-scan-btn"
                  onClick={() => setEditingEstimates(!editingEstimates)}
                  type="button"
                  style={{ fontSize: "0.75rem", padding: "0.375rem 1rem" }}
                >
                  {editingEstimates ? "Cancel" : "Edit Estimates"}
                </button>
              </div>
              {editingEstimates && (
                <SettingsEditor
                  title="Partner Hour Estimates"
                  values={estimates as unknown as Record<string, number>}
                  labels={Object.fromEntries(
                    Object.keys(COMPONENT_LABELS).map((k) => [k, `${COMPONENT_LABELS[k]} (hrs)`])
                  )}
                  onSave={handleSaveEstimates}
                  onCancel={() => setEditingEstimates(false)}
                />
              )}
              <div className="ba-roi__savings">
                <div>
                  <div className="ba-roi__savings-value">{roi.savedHours.toFixed(1)}h saved</div>
                  <div className="ba-roi__savings-label">Time Savings</div>
                </div>
                <div className="ba-roi__savings-percent">{roi.savingsPercent.toFixed(0)}%</div>
              </div>
              <div className="ba-roi__comparison">
                <div className="ba-roi__metric">
                  <div className="ba-roi__metric-value" style={{ color: "#dc2626" }}>{roi.manualHours}h</div>
                  <div className="ba-roi__metric-label">Manual Estimate</div>
                </div>
                <div className="ba-roi__metric">
                  <div className="ba-roi__metric-value" style={{ color: "#059669" }}>
                    {Math.floor(roi.buildAgentHours)}h {Math.round((roi.buildAgentHours % 1) * 60)}m
                  </div>
                  <div className="ba-roi__metric-label">Build Agent Time</div>
                </div>
              </div>
              <div className="ba-roi__breakdown">
                {(Object.keys(COMPONENT_LABELS) as Array<keyof PartnerEstimates>).map((key) => {
                  const count = composition[key].length;
                  const hrs = estimates[key];
                  const total = count * hrs;
                  if (count === 0) return null;
                  return (
                    <div className="ba-roi__breakdown-row" key={key}>
                      <span>{count} {COMPONENT_LABELS[key]} × {hrs}h</span>
                      <span style={{ fontWeight: 700 }}>{total}h manual</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="ba-section">
        <h2 className="ba-section__title">Conversations Timeline</h2>
        <DataTable
          columns={columns}
          rows={convoData}
          onRowClick={(row) => onNavigate("conversation", value(row.raw.sys_id))}
        />
      </div>

      {/* Composition Modal */}
      {modalData && (
        <CompositionModal
          icon={modalData.icon}
          label={modalData.label}
          items={modalData.items}
          onClose={() => setModalData(null)}
        />
      )}
    </div>
  );
}
