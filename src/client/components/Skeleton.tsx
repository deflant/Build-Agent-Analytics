import React from "react";

/**
 * Base skeleton block — a pulsing rectangular placeholder.
 * Accepts width, height, and optional borderRadius.
 */
export function SkeletonBlock({
  width = "100%",
  height = "1rem",
  borderRadius = "4px",
  style = {},
}: {
  width?: string;
  height?: string;
  borderRadius?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="ba-skeleton-block"
      style={{ width, height, borderRadius, ...style }}
    />
  );
}

/**
 * Skeleton for a KPI card — mimics the shape of KpiCard.
 */
export function SkeletonKpiCard() {
  return (
    <div className="ba-skeleton-kpi">
      <SkeletonBlock width="60%" height="0.75rem" />
      <SkeletonBlock width="40%" height="1.8rem" style={{ marginTop: "0.75rem" }} />
    </div>
  );
}

/**
 * Skeleton for a row of KPI cards.
 */
export function SkeletonKpiRow({ count = 4 }: { count?: number }) {
  return (
    <div className="ba-kpi-row">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonKpiCard key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton for a single table row.
 */
function SkeletonTableRow({ columns = 5 }: { columns?: number }) {
  return (
    <div className="ba-skeleton-table-row">
      {Array.from({ length: columns }).map((_, i) => (
        <SkeletonBlock
          key={i}
          width={i === 0 ? "70%" : `${40 + Math.random() * 30}%`}
          height="0.85rem"
        />
      ))}
    </div>
  );
}

/**
 * Skeleton for a DataTable — header + rows.
 */
export function SkeletonTable({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="ba-skeleton-table">
      <div className="ba-skeleton-table-header">
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonBlock key={i} width={`${50 + Math.random() * 30}%`} height="0.75rem" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonTableRow key={i} columns={columns} />
      ))}
    </div>
  );
}

/**
 * Skeleton for a page section header (title + subtitle).
 */
export function SkeletonHeader() {
  return (
    <div className="ba-skeleton-header">
      <SkeletonBlock width="35%" height="1.6rem" />
      <SkeletonBlock width="55%" height="0.85rem" style={{ marginTop: "0.5rem" }} />
    </div>
  );
}

/**
 * Skeleton for a search bar.
 */
export function SkeletonSearch() {
  return (
    <div className="ba-skeleton-search">
      <SkeletonBlock width="100%" height="2.5rem" borderRadius="8px" />
    </div>
  );
}

/**
 * Full page skeleton for the Applications view.
 */
export function SkeletonApplicationsView() {
  return (
    <div className="ba-view ba-skeleton-view">
      <SkeletonHeader />
      <SkeletonKpiRow count={4} />
      <SkeletonSearch />
      <SkeletonTable rows={8} columns={5} />
    </div>
  );
}

/**
 * Full page skeleton for the Performance view.
 */
export function SkeletonPerformanceView() {
  return (
    <div className="ba-view ba-skeleton-view">
      <SkeletonHeader />
      <SkeletonKpiRow count={5} />
      <div className="ba-skeleton-chart">
        <SkeletonBlock width="100%" height="3rem" borderRadius="8px" />
      </div>
      <SkeletonTable rows={6} columns={6} />
    </div>
  );
}

/**
 * Full page skeleton for the Consumption view.
 */
export function SkeletonConsumptionView() {
  return (
    <div className="ba-view ba-skeleton-view">
      <SkeletonHeader />
      <SkeletonKpiRow count={3} />
      <SkeletonTable rows={8} columns={5} />
    </div>
  );
}

/**
 * Generic detail page skeleton.
 */
export function SkeletonDetailView() {
  return (
    <div className="ba-view ba-skeleton-view">
      <SkeletonHeader />
      <SkeletonKpiRow count={4} />
      <div className="ba-skeleton-section">
        <SkeletonBlock width="25%" height="1rem" style={{ marginBottom: "1rem" }} />
        <SkeletonTable rows={5} columns={4} />
      </div>
    </div>
  );
}

/**
 * Full page skeleton for the App Detail view.
 */
export function SkeletonAppDetailView() {
  return (
    <div className="ba-view ba-skeleton-view">
      <SkeletonBlock width="160px" height="1.5rem" borderRadius="4px" />
      <SkeletonHeader />
      <SkeletonKpiRow count={5} />
      <div className="ba-skeleton-section">
        <SkeletonBlock width="20%" height="1rem" style={{ marginBottom: "1rem" }} />
        <SkeletonTable rows={4} columns={4} />
      </div>
      <div className="ba-skeleton-section">
        <SkeletonBlock width="25%" height="1rem" style={{ marginBottom: "1rem" }} />
        <SkeletonTable rows={6} columns={7} />
      </div>
    </div>
  );
}

/**
 * Full page skeleton for the User Profile view.
 */
export function SkeletonUserProfileView() {
  return (
    <div className="ba-view ba-skeleton-view">
      <SkeletonBlock width="160px" height="1.5rem" borderRadius="4px" />
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "1.5rem" }}>
        <SkeletonBlock width="56px" height="56px" borderRadius="50%" />
        <div style={{ flex: 1 }}>
          <SkeletonBlock width="30%" height="1.6rem" />
          <SkeletonBlock width="50%" height="0.85rem" style={{ marginTop: "0.5rem" }} />
        </div>
      </div>
      <SkeletonKpiRow count={4} />
      <div className="ba-skeleton-chart">
        <SkeletonBlock width="100%" height="180px" borderRadius="8px" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1.5rem" }}>
        <SkeletonBlock width="100%" height="200px" borderRadius="8px" />
        <SkeletonTable rows={5} columns={5} />
      </div>
    </div>
  );
}
