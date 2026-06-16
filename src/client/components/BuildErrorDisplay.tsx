import React, { useState } from "react";

interface ParsedError {
  file: string;
  shortFile: string;
  line: number;
  col: number;
  code: string;
  message: string;
}

interface FileGroup {
  file: string;
  shortFile: string;
  errors: ParsedError[];
}

/** Strip ANSI escape codes from a string */
function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m|\[\d+m/g, "");
}

/** Extract just the filename from a full path */
function shortFileName(fullPath: string): string {
  const parts = fullPath.split("/");
  // Return last 2 segments for context (e.g. "services/api.ts")
  if (parts.length >= 2) {
    return parts.slice(-2).join("/");
  }
  return parts[parts.length - 1];
}

/**
 * Parse raw build error text into structured error objects.
 * Supports formats like:
 *   filepath : line : col – error TSxxxx: message
 *   filepath(line,col): error TSxxxx: message
 */
function parseErrors(raw: string): ParsedError[] {
  const cleaned = stripAnsi(raw);
  const errors: ParsedError[] = [];

  // Pattern: filepath : line : col – error TSxxxx: message
  // Also handles variations with different separators
  const lines = cleaned.split("\n");

  for (const line of lines) {
    // Pattern 1: "file : line : col – error TSxxxx: message"
    const match1 = line.match(
      /([^\s:]+\.[a-z]+)\s*:\s*(\d+)\s*:\s*(\d+)\s*[–-]\s*error\s+(TS\d+)\s*:\s*(.+)/i
    );
    if (match1) {
      errors.push({
        file: match1[1].trim(),
        shortFile: shortFileName(match1[1].trim()),
        line: parseInt(match1[2]),
        col: parseInt(match1[3]),
        code: match1[4],
        message: match1[5].trim(),
      });
      continue;
    }

    // Pattern 2: "file(line,col): error TSxxxx: message"
    const match2 = line.match(
      /([^\s(]+\.[a-z]+)\((\d+),(\d+)\)\s*:\s*error\s+(TS\d+)\s*:\s*(.+)/i
    );
    if (match2) {
      errors.push({
        file: match2[1].trim(),
        shortFile: shortFileName(match2[1].trim()),
        line: parseInt(match2[2]),
        col: parseInt(match2[3]),
        code: match2[4],
        message: match2[5].trim(),
      });
      continue;
    }
  }

  // Deduplicate errors (same file + line + code)
  const seen = new Set<string>();
  const unique: ParsedError[] = [];
  for (const err of errors) {
    const key = `${err.file}:${err.line}:${err.code}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(err);
    }
  }

  return unique;
}

/** Group errors by file */
function groupByFile(errors: ParsedError[]): FileGroup[] {
  const map = new Map<string, ParsedError[]>();
  for (const err of errors) {
    const existing = map.get(err.file) || [];
    existing.push(err);
    map.set(err.file, existing);
  }
  return Array.from(map.entries()).map(([file, errors]) => ({
    file,
    shortFile: errors[0].shortFile,
    errors: errors.sort((a, b) => a.line - b.line),
  }));
}

interface BuildErrorDisplayProps {
  rawErrors: string;
}

export default function BuildErrorDisplay({ rawErrors }: BuildErrorDisplayProps) {
  const [showRaw, setShowRaw] = useState(false);

  const errors = parseErrors(rawErrors);
  const groups = groupByFile(errors);

  // If we couldn't parse any errors, show a cleaned-up fallback
  if (errors.length === 0) {
    const cleaned = stripAnsi(rawErrors).trim();
    return (
      <div className="ba-build-errors">
        <div className="ba-build-errors__header">
          <span className="ba-build-errors__icon">⚠️</span>
          <span className="ba-build-errors__title">Build Errors</span>
        </div>
        <pre className="ba-build-errors__fallback">{cleaned}</pre>
      </div>
    );
  }

  const totalErrors = errors.length;
  const totalFiles = groups.length;

  return (
    <div className="ba-build-errors">
      <div className="ba-build-errors__header">
        <span className="ba-build-errors__icon">⚠️</span>
        <span className="ba-build-errors__title">Build Errors</span>
        <span className="ba-build-errors__summary">
          {totalErrors} error{totalErrors !== 1 ? "s" : ""} in {totalFiles} file{totalFiles !== 1 ? "s" : ""}
        </span>
        <button
          className="ba-build-errors__toggle-raw"
          onClick={(e) => { e.stopPropagation(); setShowRaw(!showRaw); }}
          type="button"
          title="Toggle raw output"
        >
          {showRaw ? "Structured" : "Raw"}
        </button>
      </div>

      {showRaw ? (
        <pre className="ba-build-errors__fallback">{stripAnsi(rawErrors).trim()}</pre>
      ) : (
        <div className="ba-build-errors__groups">
          {groups.map((group) => (
            <div className="ba-build-errors__file-group" key={group.file}>
              <div className="ba-build-errors__file-header">
                <span className="ba-build-errors__file-icon">📄</span>
                <span className="ba-build-errors__file-name">{group.shortFile}</span>
                <span className="ba-build-errors__file-count">
                  {group.errors.length} error{group.errors.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="ba-build-errors__error-list">
                {group.errors.map((err, i) => (
                  <div className="ba-build-errors__error-item" key={i}>
                    <div className="ba-build-errors__error-meta">
                      <span className="ba-build-errors__error-code">{err.code}</span>
                      <span className="ba-build-errors__error-location">
                        L{err.line}:{err.col}
                      </span>
                    </div>
                    <div className="ba-build-errors__error-message">
                      {err.message}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
