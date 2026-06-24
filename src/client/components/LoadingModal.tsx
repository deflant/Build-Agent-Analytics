import React from "react";
import { useQueryTracker } from "../services/queryTracker.ts";
import type { TrackedQuery } from "../services/queryTracker.ts";

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function QueryIcon({ status }: { status: TrackedQuery["status"] }) {
  switch (status) {
    case "done":
      return <span className="ba-lm-icon ba-lm-icon--done">✓</span>;
    case "error":
      return <span className="ba-lm-icon ba-lm-icon--error">✗</span>;
    case "pending":
    default:
      return <span className="ba-lm-icon ba-lm-icon--pending"><span className="ba-lm-spinner" /></span>;
  }
}

/**
 * Loading Modal — shows a centered overlay with a live list of running queries.
 * Renders only when isLoading is true in the QueryTracker context.
 * After all queries finish, it stays visible for a brief moment to show final timings,
 * then fades out.
 */
export default function LoadingModal() {
  const { queries, isLoading, totalElapsed } = useQueryTracker();

  // Don't render if no queries have been tracked
  if (queries.length === 0) return null;

  const doneCount = queries.filter((q) => q.status === "done").length;
  const errorCount = queries.filter((q) => q.status === "error").length;
  const totalCount = queries.length;
  const allDone = !isLoading;
  const progress = totalCount > 0 ? ((doneCount + errorCount) / totalCount) * 100 : 0;

  return (
    <div className={`ba-lm-overlay ${allDone ? "ba-lm-overlay--done" : ""}`}>
      <div className="ba-lm-modal">
        {/* Header */}
        <div className="ba-lm-header">
          <div className="ba-lm-header__title">
            {allDone ? "✓ Data Ready" : "Loading Data…"}
          </div>
          <div className="ba-lm-header__subtitle">
            {allDone
              ? `Completed ${totalCount} queries in ${formatMs(totalElapsed)}`
              : `Running ${totalCount - doneCount - errorCount} of ${totalCount} queries…`}
          </div>
        </div>

        {/* Progress bar */}
        <div className="ba-lm-progress">
          <div
            className="ba-lm-progress__bar"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Query list */}
        <div className="ba-lm-list">
          {queries.map((q) => (
            <div
              key={q.id}
              className={`ba-lm-item ba-lm-item--${q.status}`}
            >
              <QueryIcon status={q.status} />
              <span className="ba-lm-item__label">{q.label}</span>
              <span className="ba-lm-item__time">{formatMs(q.elapsed)}</span>
            </div>
          ))}
        </div>

        {/* Footer with total time */}
        <div className="ba-lm-footer">
          <span className="ba-lm-footer__elapsed">
            ⏱ Total: {formatMs(totalElapsed)}
          </span>
          {allDone && (
            <span className="ba-lm-footer__status">All queries completed</span>
          )}
        </div>
      </div>
    </div>
  );
}
