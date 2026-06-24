import React, { useEffect, useState, useCallback } from "react";
import {
  fetchUserConsumption,
  fetchConsumptionMonths,
} from "../services/api.ts";
import type { UserConsumptionRow } from "../services/api.ts";
import { useQueryTracker } from "../services/queryTracker.ts";
import { SkeletonConsumptionView } from "./Skeleton.tsx";
import DataTable from "./DataTable.tsx";
import type { Column } from "./DataTable.tsx";
import KpiCard from "./KpiCard.tsx";

interface UserConsumptionProps {
  onNavigate: (view: string, id?: string, month?: string | null) => void;
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(month: string): string {
  const [year, m] = month.split("-");
  const date = new Date(parseInt(year), parseInt(m) - 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function UserConsumption({ onNavigate }: UserConsumptionProps) {
  const [users, setUsers] = useState<UserConsumptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth());
  const [searchQuery, setSearchQuery] = useState("");

  // KPI totals
  const [kpiUsers, setKpiUsers] = useState(0);
  const [kpiConversations, setKpiConversations] = useState(0);
  const [kpiUserMessages, setKpiUserMessages] = useState(0);
  const [kpiNau, setKpiNau] = useState(0);
  const [kpiLoading, setKpiLoading] = useState(true);

  const [sortKey, setSortKey] = useState<string>("nauUnits");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { track, reset } = useQueryTracker();

  useEffect(() => {
    reset();
    loadMonths();
  }, []);

  useEffect(() => {
    loadData(selectedMonth);
  }, [selectedMonth]);

  async function loadMonths() {
    try {
      const available = await track("Fetching available months", () => fetchConsumptionMonths());
      setMonths(available);
      // If current month is not in the list, default to the most recent month
      if (available.length > 0 && !available.includes(selectedMonth)) {
        setSelectedMonth(available[0]);
      }
    } catch (e) {
      console.error("Error loading months:", e);
    }
  }

  async function loadData(month: string) {
    setLoading(true);
    setKpiLoading(true);
    try {
      const data = await track("Fetching consumption data", () => fetchUserConsumption(month));
      setUsers(data);

      // Compute KPIs from the data
      const totalUsers = data.length;
      const totalConvos = data.reduce((sum, u) => sum + u.conversations, 0);
      const totalUserMsgs = data.reduce((sum, u) => sum + u.userMessages, 0);
      const totalNau = data.reduce((sum, u) => sum + u.nauUnits, 0);

      setKpiUsers(totalUsers);
      setKpiConversations(totalConvos);
      setKpiUserMessages(totalUserMsgs);
      setKpiNau(totalNau);
    } catch (e) {
      console.error("Error loading consumption data:", e);
    } finally {
      setLoading(false);
      setKpiLoading(false);
    }
  }

  const refreshData = useCallback(async () => {
    await loadData(selectedMonth);
  }, [selectedMonth]);

  function handleSort(key: string, direction: "asc" | "desc") {
    setSortKey(key);
    setSortDir(direction);
  }

  // Sort users
  const sortedUsers = [...users].sort((a, b) => {
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

  // Apply search filter
  const filteredUsers = searchQuery.trim()
    ? sortedUsers.filter((user) => {
        const q = searchQuery.toLowerCase();
        return user.userName.toLowerCase().includes(q);
      })
    : sortedUsers;

  const columns: Column[] = [
    { key: "userName", label: "User Name", sortable: true },
    { key: "conversations", label: "Conversations", sortable: true },
    { key: "userMessages", label: "User Messages", sortable: true },
    { key: "nauUnits", label: "Now Assist Units", sortable: true },
  ];

  if (loading && kpiLoading) return <SkeletonConsumptionView />;

  return (
    <div className="ba-view">
      <div className="ba-consumption-header">
        <div>
          <h1 className="ba-view__title">User Consumption</h1>
          <p className="ba-view__subtitle">
            Now Assist Unit consumption by user — each user message = 25 NAU.
          </p>
        </div>
        <div className="ba-month-nav">
          <button
            className="ba-month-nav__arrow"
            onClick={() => {
              const idx = months.indexOf(selectedMonth);
              if (idx < months.length - 1) setSelectedMonth(months[idx + 1]);
            }}
            disabled={months.indexOf(selectedMonth) >= months.length - 1}
            aria-label="Previous month"
            type="button"
          >
            ◀
          </button>
          <span className="ba-month-nav__label">{formatMonthLabel(selectedMonth)}</span>
          <button
            className="ba-month-nav__arrow"
            onClick={() => {
              const idx = months.indexOf(selectedMonth);
              if (idx > 0) setSelectedMonth(months[idx - 1]);
            }}
            disabled={months.indexOf(selectedMonth) <= 0}
            aria-label="Next month"
            type="button"
          >
            ▶
          </button>
        </div>
      </div>

      <div className="ba-kpi-row">
        <KpiCard
          title="Total Users"
          value={kpiUsers}
          loading={kpiLoading}
          onRefresh={refreshData}
        />
        <KpiCard
          title="Total Conversations"
          value={kpiConversations}
          loading={kpiLoading}
          onRefresh={refreshData}
        />
        <KpiCard
          title="User Messages"
          value={kpiUserMessages}
          loading={kpiLoading}
          onRefresh={refreshData}
        />
        <KpiCard
          title="Now Assist Units"
          value={kpiNau}
          loading={kpiLoading}
          onRefresh={refreshData}
        />
      </div>

      <div className="ba-search">
        <span className="ba-search__icon">🔍</span>
        <input
          className="ba-search__input"
          type="text"
          placeholder="Search by user name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search users"
        />
        {searchQuery && (
          <button
            className="ba-search__clear"
            onClick={() => setSearchQuery("")}
            type="button"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={filteredUsers}
        onRowClick={(row) => {
          onNavigate("user-profile", row.userId);
        }}
        emptyMessage={searchQuery ? "No users match your search" : "No consumption data for this period"}
        defaultSort={{ key: "nauUnits", direction: "desc" }}
        onSort={handleSort}
      />
    </div>
  );
}
