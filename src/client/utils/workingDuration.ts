/**
 * Implementation duration utilities.
 *
 * Primary metric: sum of time intervals between consecutive user messages.
 * This reflects actual "interaction time" — how long the user actively worked
 * with Build Agent across all conversations for an application.
 */

import { parseMessageContent, isUserMessage } from "./fields.ts";

// ─── Date Parsing ────────────────────────────────────────────────────────────

/**
 * Parse a ServiceNow date string into a Date object.
 * Accepts "YYYY-MM-DD HH:mm:ss" or ISO format.
 */
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const normalized = dateStr.replace(" ", "T");
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

// ─── Implementation Duration (Message-based) ────────────────────────────────

/**
 * Extract the value from a ServiceNow display_value/value field.
 */
function fieldValue(field: any): string {
  if (typeof field === "string") return field;
  return field?.value || "";
}

/**
 * Given an array of message records (with `content` and `sys_created_on` fields),
 * compute the implementation duration as the sum of intervals between consecutive
 * user messages, in milliseconds.
 *
 * Algorithm:
 * 1. Filter messages to only user messages
 * 2. Extract and sort by sys_created_on timestamp
 * 3. Calculate delta between each consecutive pair
 * 4. Sum all deltas
 */
export function calculateImplDurationMs(messages: any[]): number {
  // Collect timestamps of user messages
  const userTimestamps: number[] = [];

  for (const msg of messages) {
    const parsed = parseMessageContent(msg.content);
    if (!parsed) continue;
    if (!isUserMessage(parsed.sender)) continue;

    const dateStr = fieldValue(msg.sys_created_on);
    const date = parseDate(dateStr);
    if (date) {
      userTimestamps.push(date.getTime());
    }
  }

  // Sort chronologically
  userTimestamps.sort((a, b) => a - b);

  // Sum deltas between consecutive user messages
  let totalMs = 0;
  for (let i = 1; i < userTimestamps.length; i++) {
    totalMs += userTimestamps[i] - userTimestamps[i - 1];
  }

  return totalMs;
}

/**
 * Format milliseconds as a human-readable duration string.
 * Examples: "3h 45m", "1d 2h", "< 1m", "12m"
 */
export function formatDurationMs(ms: number): string {
  if (ms <= 0) return "—";

  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 1) return "< 1m";

  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  if (totalHours === 0) {
    return `${remainingMinutes}m`;
  }

  const days = Math.floor(totalHours / 24);
  const remainingHours = totalHours % 24;

  if (days === 0) {
    if (remainingMinutes === 0) return `${totalHours}h`;
    return `${totalHours}h ${remainingMinutes}m`;
  }

  if (remainingHours === 0) return `${days}d`;
  return `${days}d ${remainingHours}h`;
}

/**
 * Calculate impl duration from an array of message arrays (one per conversation),
 * returning a formatted string.
 */
export function formatImplDuration(allMessages: any[][]): string {
  let totalMs = 0;
  for (const msgs of allMessages) {
    totalMs += calculateImplDurationMs(msgs);
  }
  return formatDurationMs(totalMs);
}

/**
 * Calculate total implementation minutes from an array of message arrays.
 * Used for ROI calculations where raw numeric value is needed.
 */
export function getImplMinutes(allMessages: any[][]): number {
  let totalMs = 0;
  for (const msgs of allMessages) {
    totalMs += calculateImplDurationMs(msgs);
  }
  return Math.round(totalMs / 60000);
}
