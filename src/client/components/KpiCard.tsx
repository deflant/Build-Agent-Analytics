import React, { useState } from "react";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon?: "user" | "assistant" | "cost" | "duration" | "tokens" | string;
  tooltip?: string;
  onRefresh?: () => Promise<void>;
  loading?: boolean;
}

export default function KpiCard({ title, value: kpiValue, icon, tooltip, onRefresh, loading }: KpiCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const iconEmoji = icon === "user" ? "👤"
    : icon === "assistant" ? "🤖"
    : icon === "cost" ? "💎"
    : icon === "duration" ? "⏱️"
    : icon === "tokens" ? "🔢"
    : null;

  const modifier = icon === "user"
    ? " ba-kpi-card--user"
    : icon === "assistant"
    ? " ba-kpi-card--assistant"
    : icon === "cost"
    ? " ba-kpi-card--cost"
    : icon === "duration"
    ? " ba-kpi-card--duration"
    : icon === "tokens"
    ? " ba-kpi-card--tokens"
    : "";

  const isLoading = loading || refreshing;

  async function handleRefresh(e: React.MouseEvent) {
    e.stopPropagation();
    if (!onRefresh || isLoading) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div
      className={`ba-kpi-card${modifier}`}
      onMouseEnter={() => tooltip && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {onRefresh && (
        <button
          className={`ba-kpi-card__refresh${isLoading ? " ba-kpi-card__refresh--spinning" : ""}`}
          onClick={handleRefresh}
          disabled={isLoading}
          title="Refresh"
          aria-label={`Refresh ${title}`}
        >
          ↻
        </button>
      )}
      <div className={`ba-kpi-card__value${isLoading ? " ba-kpi-card__value--loading" : ""}`}>
        {iconEmoji && <span className="ba-kpi-card__icon">{iconEmoji}</span>}
        {isLoading ? "…" : kpiValue}
      </div>
      <div className="ba-kpi-card__title">{title}</div>
      {tooltip && showTooltip && (
        <div className="ba-kpi-card__tooltip">{tooltip}</div>
      )}
    </div>
  );
}
