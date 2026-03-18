// src/components/ReviewHistory.tsx
"use client";

import { useState, useEffect, useCallback } from "react";

interface ReviewIssue {
  type: "bug" | "style" | "performance" | "security";
  severity: "low" | "medium" | "high" | "critical";
  line?: number;
  title: string;
  explanation: string;
  suggestion: string;
  fixedCode?: string;
}

interface ReviewData {
  summary: string;
  issues: ReviewIssue[];
  overallScore: number;
  languageDetected: string;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  language: string;
  difficulty: string;
  score: number;
  issueCount: number;
  codePreview: string; // First 80 chars of the code
  review: ReviewData;
  code: string;
}

const STORAGE_KEY = "codelens-history";
const MAX_ENTRIES = 10;

/**
 * Read history from localStorage safely.
 * Returns empty array if anything goes wrong.
 */
function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

/**
 * Save history to localStorage.
 * Silently fails if storage is full or unavailable.
 */
function saveHistory(entries: HistoryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

/**
 * Public function to add a review to history.
 * Called from the main page after a successful review.
 */
export function addToHistory(
  code: string,
  language: string,
  difficulty: string,
  review: ReviewData
): void {
  const entries = loadHistory();

  const entry: HistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    timestamp: Date.now(),
    language,
    difficulty,
    score: review.overallScore,
    issueCount: review.issues.length,
    codePreview: code.trim().substring(0, 80).replace(/\n/g, " "),
    review,
    code,
  };

  // Prepend new entry, cap at MAX_ENTRIES
  const updated = [entry, ...entries].slice(0, MAX_ENTRIES);
  saveHistory(updated);
}

interface Props {
  onRestore: (code: string, language: string, difficulty: string, review: ReviewData) => void;
}

export default function ReviewHistory({ onRestore }: Props) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setEntries(loadHistory());
  }, []);

  // Refresh history when panel opens
  useEffect(() => {
    if (isOpen) {
      setEntries(loadHistory());
    }
  }, [isOpen]);

  const handleDelete = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = loadHistory().filter((entry) => entry.id !== id);
    saveHistory(updated);
    setEntries(updated);
  }, []);

  const handleClearAll = useCallback(() => {
    saveHistory([]);
    setEntries([]);
  }, []);

  const handleRestore = useCallback(
    (entry: HistoryEntry) => {
      onRestore(entry.code, entry.language, entry.difficulty, entry.review);
      setIsOpen(false);
    },
    [onRestore]
  );

  const formatTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const scoreColor = (score: number): string => {
    if (score >= 80) return "var(--accent)";
    if (score >= 60) return "var(--warning)";
    return "var(--danger)";
  };

  if (entries.length === 0 && !isOpen) return null;

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
        style={{
          backgroundColor: isOpen ? "var(--accent)" : "var(--bg-tertiary)",
          color: isOpen ? "#fff" : "var(--text-secondary)",
        }}
        aria-label="Review history"
        aria-expanded={isOpen}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span className="hidden sm:inline">History</span>
        {entries.length > 0 && (
          <span
            className="w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
            style={{
              backgroundColor: isOpen ? "rgba(255,255,255,0.2)" : "var(--accent)",
              color: "#fff",
            }}
          >
            {entries.length}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <div
            className="fixed inset-0 z-40 lg:hidden"
            style={{ backgroundColor: "var(--overlay)" }}
            onClick={() => setIsOpen(false)}
          />

          <div
            className="fixed right-0 top-0 bottom-0 w-full sm:w-96 z-50 lg:absolute lg:top-full lg:right-0 lg:bottom-auto lg:mt-2 lg:w-96 lg:rounded-xl border shadow-2xl overflow-hidden flex flex-col"
            style={{
              backgroundColor: "var(--card-bg)",
              borderColor: "var(--card-border)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 border-b"
              style={{ borderColor: "var(--border-color)" }}
            >
              <h3
                className="text-sm font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                Review History
              </h3>
              <div className="flex items-center gap-2">
                {entries.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="text-[11px] font-medium px-2 py-1 rounded transition-colors"
                    style={{ color: "var(--danger)" }}
                  >
                    Clear All
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
                  style={{ color: "var(--text-muted)" }}
                  aria-label="Close history"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Entries list */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {entries.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    No reviews yet. Your review history will appear here.
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {entries.map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => handleRestore(entry)}
                      className="w-full text-left p-3 rounded-lg transition-colors group"
                      style={{ backgroundColor: "transparent" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--bg-tertiary)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-base font-bold tabular-nums"
                            style={{ color: scoreColor(entry.score) }}
                          >
                            {entry.score}
                          </span>
                          <span
                            className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: "var(--bg-tertiary)",
                              color: "var(--text-muted)",
                            }}
                          >
                            {entry.language}
                          </span>
                          <span
                            className="text-[10px]"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {entry.issueCount} issue{entry.issueCount !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="text-[10px]"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {formatTime(entry.timestamp)}
                          </span>
                          <span
                            onClick={(e) => handleDelete(entry.id, e)}
                            className="w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            style={{ color: "var(--danger)" }}
                            role="button"
                            aria-label="Delete this entry"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </span>
                        </div>
                      </div>
                      <p
                        className="text-[11px] truncate"
                        style={{
                          color: "var(--text-muted)",
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {entry.codePreview}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}