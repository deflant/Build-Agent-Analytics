import React, { useState } from "react";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon?: "user" | "assistant" | "cost" | "duration" | "tokens" | string;
  tooltip?: string;
}

export default function KpiCard({ title, value: kpiValue, icon, tooltip }: KpiCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);

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

  return (
    <div
      className={`ba-kpi-card${modifier}`}
      onMouseEnter={() => tooltip && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="ba-kpi-card__value">
        {iconEmoji && <span className="ba-kpi-card__icon">{iconEmoji}</span>}
        {kpiValue}
      </div>
      <div className="ba-kpi-card__title">{title}</div>
      {tooltip && showTooltip && (
        <div className="ba-kpi-card__tooltip">{tooltip}</div>
      )}
    </div>
  );
}
