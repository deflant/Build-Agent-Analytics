import React, { useEffect, useState, useCallback } from "react";
import { display, value } from "../utils/fields.ts";
import {
  fetchConversations,
  fetchAllMessages,
  fetchAllCheckpoints,
  fetchAppNames,
} from "../services/api.ts";
import DataTable from "./DataTable.tsx";
import type { Column } from "./DataTable.tsx";
import KpiCard from "./KpiCard.tsx";

interface ApplicationsProps {
  onNavigate: (view: string, id?: string) => void;
}

interface AppStat {
  id: string;
  name: string;
  conversations: number;
  messages: number;
  checkpoints: number;
  lastActivity: string;
  isFavorite: boolean;
}

const FAVORITES_KEY = "ba_favorite_apps";

function loadFavorites(): Set<string> {
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    if (stored) return new Set(JSON.parse(stored));
  } catch { /* ignore parse errors */ }
  return new Set();
}

function saveFavorites(favorites: Set<string>) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(favorites)));
}

export default function Applications({ onNavigate }: ApplicationsProps) {
  const [apps, setApps] = useState<AppStat[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites);
  const [loading, setLoading] = useState(true);
  const [totalConversations, setTotalConversations] = useState(0);
  const [totalMessages, setTotalMessages] = useState(0);
  const [totalCheckpoints, setTotalCheckpoints] = useState(0);
  const [sortKey, setSortKey] = useState<string>("lastActivity");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    loadData();
  }, []);

  const toggleFavorite = useCallback((appId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(appId)) {
        next.delete(appId);
      } else {
        next.add(appId);
      }
      saveFavorites(next);
      return next;
    });
  }, []);

  async function loadData() {
    try {
      const [convos, msgs, chks] = await Promise.all([
        fetchConversations("ORDERBYDESClast_message_at"),
        fetchAllMessages(),
        fetchAllCheckpoints(),
      ]);

      setTotalConversations(convos.length);
      setTotalMessages(msgs.length);
      setTotalCheckpoints(chks.length);

      const msgByConvo = new Map<string, number>();
      msgs.forEach((m: any) => {
        const cId = value(m.conversation);
        msgByConvo.set(cId, (msgByConvo.get(cId) || 0) + 1);
      });

      const chkByConvo = new Map<string, number>();
      chks.forEach((c: any) => {
        const cId = value(c.conversation);
        chkByConvo.set(cId, (chkByConvo.get(cId) || 0) + 1);
      });

      // Build preliminary app map
      const appMap = new Map<string, AppStat>();
      const missingNameIds: string[] = [];
      const storedFavorites = loadFavorites();

      convos.forEach((c: any) => {
        const appId = value(c.application_id);
        if (!appId) return;
        const convoId = value(c.sys_id);
        const existingName = display(c.application_name);
        const existing = appMap.get(appId) || {
          id: appId,
          name: existingName || "",
          conversations: 0,
          messages: 0,
          checkpoints: 0,
          lastActivity: "",
          isFavorite: storedFavorites.has(appId),
        };
        existing.conversations += 1;
        existing.messages += msgByConvo.get(convoId) || 0;
        existing.checkpoints += chkByConvo.get(convoId) || 0;
        if (!existing.lastActivity) {
          existing.lastActivity = display(c.last_message_at);
        }
        // Track the best name available
        if (existingName && !existing.name) {
          existing.name = existingName;
        }
        appMap.set(appId, existing);
      });

      // Resolve missing app names from sys_app
      appMap.forEach((stat, appId) => {
        if (!stat.name) missingNameIds.push(appId);
      });

      if (missingNameIds.length > 0) {
        const resolvedNames = await fetchAppNames(missingNameIds);
        resolvedNames.forEach((name, id) => {
          const stat = appMap.get(id);
          if (stat) stat.name = name;
        });
      }

      // Final fallback for any still unnamed
      appMap.forEach((stat) => {
        if (!stat.name) stat.name = `App (${stat.id.substring(0, 8)}...)`;
      });

      setApps(Array.from(appMap.values()));
    } catch (e) {
      console.error("Applications load error:", e);
    } finally {
      setLoading(false);
    }
  }

  function handleSort(key: string, direction: "asc" | "desc") {
    setSortKey(key);
    setSortDir(direction);
  }

  // Sort: favorites pinned at top, then by user-selected column
  const sortedApps = [...apps].map((app) => ({
    ...app,
    isFavorite: favorites.has(app.id),
  })).sort((a, b) => {
    // Favorites always on top
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    // Sort by selected column
    const aVal = (a as any)[sortKey];
    const bVal = (b as any)[sortKey];
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    let comparison = 0;
    if (typeof aVal === "number" && typeof bVal === "number") {
      comparison = aVal - bVal;
    } else {
      comparison = String(aVal).localeCompare(String(bVal));
    }
    return sortDir === "asc" ? comparison : -comparison;
  });

  if (loading) return <div className="ba-loading">Loading applications...</div>;

  const columns: Column[] = [
    {
      key: "favorite",
      label: "★",
      render: (row: AppStat) => (
        <button
          className={`ba-star-btn ${row.isFavorite ? "ba-star-btn--active" : ""}`}
          onClick={(e) => toggleFavorite(row.id, e)}
          title={row.isFavorite ? "Remove from favorites" : "Add to favorites"}
          aria-label={row.isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          {row.isFavorite ? "★" : "☆"}
        </button>
      ),
    },
    { key: "name", label: "Application", sortable: true },
    { key: "conversations", label: "Conversations", sortable: true },
    { key: "messages", label: "Total Messages", sortable: true },
    { key: "checkpoints", label: "Checkpoints", sortable: true },
    { key: "lastActivity", label: "Last Activity", sortable: true },
  ];

  return (
    <div className="ba-view">
      <h1 className="ba-view__title">Applications</h1>
      <p className="ba-view__subtitle">
        All applications built with Build Agent — click ★ to mark favorites, click a row to explore.
      </p>
      <div className="ba-kpi-row">
        <KpiCard title="Conversations" value={totalConversations} />
        <KpiCard title="Messages" value={totalMessages} />
        <KpiCard title="Apps Managed" value={apps.length} />
        <KpiCard title="Checkpoints" value={totalCheckpoints} />
      </div>
      <DataTable
        columns={columns}
        rows={sortedApps}
        onRowClick={(row) => onNavigate("app-detail", row.id)}
        emptyMessage="No applications found"
        defaultSort={{ key: "lastActivity", direction: "desc" }}
        onSort={handleSort}
      />
    </div>
  );
}
