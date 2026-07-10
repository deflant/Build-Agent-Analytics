import React, { useEffect, useState } from "react";
import { value, display } from "../utils/fields.ts";
import { fetchTaskTelemetry } from "../services/api.ts";
import { useQueryTracker } from "../services/queryTracker.ts";
import { SkeletonPerformanceView } from "./Skeleton.tsx";
import KpiCard from "./KpiCard.tsx";
import DataTable from "./DataTable.tsx";
import type { Column } from "./DataTable.tsx";
import BuildErrorDisplay from "./BuildErrorDisplay.tsx";

interface TaskRecord {
  sys_id: any;
  user: any;
  request: any;
  task_type: any;
  status: any;
  agent_status: any;
  start_time: any;
  end_time: any;
  total_time: any;
  build_fix_cycles: any;
  build_fix_errors: any;
  rollbacks: any;
  lines_added: any;
  lines_edited: any;
  lines_deleted: any;
  metadata_types: any;
  sys_created_on: any;
}

interface TaskRow {
  sysId: string;
  agentStatus: string;
  request: string;
  taskType: string;
  duration: string;
  durationSeconds: number;
  buildCycles: number;
  buildErrors: string;
  linesAdded: number;
  linesEdited: number;
  linesDeleted: number;
  rollbacks: number;
  date: string;
  dateRaw: string;
}

function parseDurationSeconds(dur: string): number {
  if (!dur) return 0;
  // ServiceNow duration format: "1970-01-01 00:02:35" or "HH:MM:SS" or display
  const hmsMatch = dur.match(/(\d+):(\d+):(\d+)/);
  if (hmsMatch) {
    return parseInt(hmsMatch[1]) * 3600 + parseInt(hmsMatch[2]) * 60 + parseInt(hmsMatch[3]);
  }
  return 0;
}

function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return "—";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.round(totalSeconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function AgentPerformance() {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { track, reset } = useQueryTracker();

  useEffect(() => {
    reset();
    loadData();
  }, []);

  async function loadData() {
    try {
      const result = await track("Fetching task telemetry", () => fetchTaskTelemetry());
      setTasks(result);
    } catch (e) {
      console.error("AgentPerformance load error:", e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <SkeletonPerformanceView />;
  if (!tasks.length) return <div className="ba-empty">No task telemetry data available yet.</div>;

  // ─── Compute KPIs ────────────────────────────────────────────────────────────

  const total = tasks.length;

  const successCount = tasks.filter((t) => value(t.agent_status) === "success").length;
  const failureCount = tasks.filter((t) => value(t.agent_status) === "failure").length;
  const errorCount = tasks.filter((t) => value(t.agent_status) === "error_internal").length;

  const successRate = total > 0 ? Math.round((successCount / total) * 100) : 0;

  // Average duration
  const durations = tasks
    .map((t) => parseDurationSeconds(value(t.total_time)))
    .filter((d) => d > 0);
  const avgDuration = durations.length > 0
    ? durations.reduce((a, b) => a + b, 0) / durations.length
    : 0;

  // Average build-fix cycles
  const cycles = tasks.map((t) => parseInt(value(t.build_fix_cycles)) || 0);
  const avgCycles = cycles.length > 0
    ? (cycles.reduce((a, b) => a + b, 0) / cycles.length).toFixed(1)
    : "0";

  // Rollback rate
  const rollbackTasks = tasks.filter((t) => (parseInt(value(t.rollbacks)) || 0) > 0).length;
  const rollbackRate = total > 0 ? Math.round((rollbackTasks / total) * 100) : 0;

  // ─── Task type breakdown ─────────────────────────────────────────────────────

  const createTasks = tasks.filter((t) => value(t.task_type) === "create");
  const editTasks = tasks.filter((t) => value(t.task_type) === "edit");

  const createSuccess = createTasks.filter((t) => value(t.agent_status) === "success").length;
  const editSuccess = editTasks.filter((t) => value(t.agent_status) === "success").length;

  const createRate = createTasks.length > 0 ? Math.round((createSuccess / createTasks.length) * 100) : 0;
  const editRate = editTasks.length > 0 ? Math.round((editSuccess / editTasks.length) * 100) : 0;

  // ─── Status distribution bar ─────────────────────────────────────────────────

  const successPct = total > 0 ? (successCount / total) * 100 : 0;
  const failurePct = total > 0 ? (failureCount / total) * 100 : 0;
  const errorPct = total > 0 ? (errorCount / total) * 100 : 0;

  // ─── Table rows ──────────────────────────────────────────────────────────────

  const rows: TaskRow[] = tasks.map((t) => ({
    sysId: value(t.sys_id),
    agentStatus: value(t.agent_status) || value(t.status),
    request: display(t.request),
    taskType: value(t.task_type),
    duration: formatDuration(parseDurationSeconds(value(t.total_time))),
    durationSeconds: parseDurationSeconds(value(t.total_time)),
    buildCycles: parseInt(value(t.build_fix_cycles)) || 0,
    buildErrors: value(t.build_fix_errors) || "",
    linesAdded: parseInt(value(t.lines_added)) || 0,
    linesEdited: parseInt(value(t.lines_edited)) || 0,
    linesDeleted: parseInt(value(t.lines_deleted)) || 0,
    rollbacks: parseInt(value(t.rollbacks)) || 0,
    date: display(t.start_time),
    dateRaw: value(t.start_time),
  }));

  const columns: Column[] = [
    {
      key: "agentStatus",
      label: "Status",
      render: (row: TaskRow) => {
        const cls = row.agentStatus === "success"
          ? "ba-status-badge--success"
          : row.agentStatus === "failure"
          ? "ba-status-badge--failure"
          : row.agentStatus === "error_internal"
          ? "ba-status-badge--error"
          : "ba-status-badge--in-progress";
        const label = row.agentStatus === "error_internal" ? "error" : row.agentStatus;
        return <span className={`ba-status-badge ${cls}`}>{label}</span>;
      },
    },
    {
      key: "request",
      label: "Request",
      render: (row: TaskRow) => (
        <span title={row.request}>
          {row.request.length > 80 ? row.request.substring(0, 80) + "…" : row.request}
        </span>
      ),
    },
    {
      key: "taskType",
      label: "Type",
      sortable: true,
      render: (row: TaskRow) => (
        <span className={`ba-type-badge ba-type-badge--${row.taskType}`}>
          {row.taskType}
        </span>
      ),
    },
    { key: "duration", label: "Duration", sortable: true, sortKey: "durationSeconds" },
    { key: "buildCycles", label: "Build Cycles", sortable: true,
      render: (row: TaskRow) => (
        <span className="ba-build-cycles">
          {row.buildCycles}
          {row.buildErrors && (
            <span className="ba-build-cycles__error-icon" title="Click row to see errors">⚠</span>
          )}
        </span>
      ),
    },
    {
      key: "linesChanged",
      label: "Lines",
      render: (row: TaskRow) => (
        <span className="ba-lines-indicator">
          <span className="ba-lines-indicator__add">+{row.linesAdded + row.linesEdited}</span>
          {row.linesDeleted > 0 && (
            <span className="ba-lines-indicator__del">−{row.linesDeleted}</span>
          )}
        </span>
      ),
    },
    { key: "date", label: "Date", sortable: true, sortKey: "dateRaw" },
  ];

  return (
    <div className="ba-view">
      <h1 className="ba-view__title">Agent Performance</h1>
      <p className="ba-view__subtitle">
        Task execution metrics, success rates, and build quality indicators.
      </p>

      {/* KPI Row */}
      <div className="ba-kpi-row">
        <KpiCard title="Success Rate" value={`${successRate}%`} tooltip={`${successCount} of ${total} tasks succeeded`} />
        <KpiCard title="Total Tasks" value={total} />
        <KpiCard title="Avg Duration" value={formatDuration(avgDuration)} icon="duration" />
        <KpiCard title="Avg Build-Fix Cycles" value={avgCycles} tooltip="Lower is better — fewer retries needed" />
        <KpiCard title="Rollback Rate" value={`${rollbackRate}%`} tooltip={`${rollbackTasks} of ${total} tasks had rollbacks`} />
      </div>

      {/* Status Distribution Bar */}
      <div className="ba-perf-distribution">
        <div className="ba-perf-distribution__title">Status Distribution</div>
        <div className="ba-perf-bar">
          {successPct > 0 && (
            <div
              className="ba-perf-bar__segment ba-perf-bar__segment--success"
              style={{ flexBasis: `${successPct}%` }}
            >
              {successPct >= 10 && `${Math.round(successPct)}%`}
            </div>
          )}
          {failurePct > 0 && (
            <div
              className="ba-perf-bar__segment ba-perf-bar__segment--failure"
              style={{ flexBasis: `${failurePct}%` }}
            >
              {failurePct >= 10 && `${Math.round(failurePct)}%`}
            </div>
          )}
          {errorPct > 0 && (
            <div
              className="ba-perf-bar__segment ba-perf-bar__segment--error"
              style={{ flexBasis: `${errorPct}%` }}
            >
              {errorPct >= 10 && `${Math.round(errorPct)}%`}
            </div>
          )}
        </div>
        <div className="ba-perf-legend">
          <div className="ba-perf-legend__item">
            <span className="ba-perf-legend__dot ba-perf-legend__dot--success"></span>
            Success ({successCount})
          </div>
          <div className="ba-perf-legend__item">
            <span className="ba-perf-legend__dot ba-perf-legend__dot--failure"></span>
            Failure ({failureCount})
          </div>
          <div className="ba-perf-legend__item">
            <span className="ba-perf-legend__dot ba-perf-legend__dot--error"></span>
            Error ({errorCount})
          </div>
        </div>
      </div>

      {/* Task Type Breakdown */}
      <div className="ba-perf-types">
        <div className="ba-perf-type-card">
          <div className="ba-perf-type-card__header">
            <span className="ba-perf-type-card__label">🆕 Create Tasks</span>
            <span className="ba-perf-type-card__count">{createTasks.length}</span>
          </div>
          <div className="ba-perf-type-card__bar">
            <div className="ba-perf-type-card__bar-fill" style={{ width: `${createRate}%` }}></div>
          </div>
          <span className="ba-perf-type-card__rate">
            {createRate}% success rate ({createSuccess}/{createTasks.length})
          </span>
        </div>
        <div className="ba-perf-type-card">
          <div className="ba-perf-type-card__header">
            <span className="ba-perf-type-card__label">✏️ Edit Tasks</span>
            <span className="ba-perf-type-card__count">{editTasks.length}</span>
          </div>
          <div className="ba-perf-type-card__bar">
            <div className="ba-perf-type-card__bar-fill" style={{ width: `${editRate}%` }}></div>
          </div>
          <span className="ba-perf-type-card__rate">
            {editRate}% success rate ({editSuccess}/{editTasks.length})
          </span>
        </div>
      </div>

      {/* Recent Tasks Table */}
      <div className="ba-section">
        <div className="ba-section__title">Recent Tasks</div>
        <DataTable
          columns={columns}
          rows={rows}
          emptyMessage="No tasks recorded yet"
          defaultSort={{ key: "dateRaw", direction: "desc" }}
          expandContent={(row: TaskRow) => {
            if (!row.buildErrors) return null;
            return <BuildErrorDisplay rawErrors={row.buildErrors} />;
          }}
        />
      </div>
    </div>
  );
}
