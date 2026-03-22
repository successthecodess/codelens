// src/app/page.tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import CodeEditor from "@/components/CodeEditor";
import ReviewResults from "@/components/ReviewResults";
import LanguageSelector from "@/components/LanguageSelector";
import DifficultyToggle from "@/components/DifficultyToggle";
import ThemeToggle from "@/components/ThemeToggle";
import ReviewHistory, { addToHistory } from "@/components/ReviewHistory";
import type { SupportedLanguage, DifficultyLevel } from "@/lib/validation";

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

const MAX_CODE_LENGTH = 15000;

export default function Home() {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState<SupportedLanguage>("python");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("beginner");
  const [review, setReview] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"editor" | "results">("editor");

  const handleReview = useCallback(async () => {
    if (!code.trim()) {
      setError("Please paste some code to review.");
      return;
    }
    if (code.length > MAX_CODE_LENGTH) {
      setError(`Code is too long (${code.length} chars). Max is ${MAX_CODE_LENGTH}.`);
      return;
    }

    setLoading(true);
    setError(null);
    setReview(null);

    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language, difficulty }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setError(`Rate limited. Wait ${data.retryAfterSeconds || 60}s and try again.`);
        } else if (response.status === 400 && data.details) {
          setError(data.details[0]?.message || "Invalid input.");
        } else {
          setError(data.error || "Something went wrong.");
        }
        return;
      }

      setReview(data.data);
      setMobileView("results");

      // Save to history
      addToHistory(code, language, difficulty, data.data);
    } catch (err) {
      console.error("[CodeLens] Review request failed:", err);
      setError(
        err instanceof Error
          ? `Request failed: ${err.message}`
          : "Network error. Check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }, [code, language, difficulty]);

  // Restore from history
  const handleRestore = useCallback(
    (restoredCode: string, restoredLang: string, restoredDiff: string, restoredReview: ReviewData) => {
      setCode(restoredCode);
      setLanguage(restoredLang as SupportedLanguage);
      setDifficulty(restoredDiff as DifficultyLevel);
      setReview(restoredReview);
      setError(null);
      setMobileView("results");
    },
    []
  );

  // Keyboard shortcut: Ctrl+Enter or Cmd+Enter to review
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        // Only trigger if not already loading
        if (!loading && code.trim()) {
          handleReview();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleReview, loading, code]);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--bg-primary)" }}>
      {/* ===== Header ===== */}
      <header
        className="sticky top-0 z-30 border-b backdrop-blur-md"
        style={{ backgroundColor: "var(--header-bg)", borderColor: "var(--border-subtle)" }}
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-2">
          {/* Logo */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--accent)" }}>
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
              </svg>
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
              CodeLens
            </h1>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 relative">
            <div className="hidden sm:block">
              <DifficultyToggle value={difficulty} onChange={setDifficulty} />
            </div>
            <ReviewHistory onRestore={handleRestore} />
            <ThemeToggle />
          </div>
        </div>

        {/* Mobile-only difficulty toggle row */}
        <div
          className="sm:hidden px-4 pb-2 flex justify-center"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <DifficultyToggle value={difficulty} onChange={setDifficulty} />
        </div>
      </header>

      {/* ===== Main ===== */}
      <main className="flex-1 max-w-[1440px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <LanguageSelector value={language} onChange={setLanguage} />
          <div className="flex-1" />

          <span
            className="text-xs font-mono tabular-nums"
            style={{ color: code.length > MAX_CODE_LENGTH * 0.9 ? "var(--danger)" : "var(--text-muted)" }}
          >
            {code.length.toLocaleString()} / {MAX_CODE_LENGTH.toLocaleString()}
          </span>

          <button
            onClick={handleReview}
            disabled={loading || !code.trim()}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: loading || !code.trim() ? "var(--bg-tertiary)" : "var(--accent)",
              color: loading || !code.trim() ? "var(--text-muted)" : "#fff",
            }}
            aria-label="Review code"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analyzing...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
                Review
                <kbd
                  className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono ml-1"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.15)",
                    color: "inherit",
                  }}
                >
                  ⌘↵
                </kbd>
              </>
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div
            className="mb-4 p-3 sm:p-4 rounded-lg border text-xs sm:text-sm animate-fade-up"
            style={{ backgroundColor: "rgba(239,68,68,0.06)", borderColor: "rgba(239,68,68,0.2)", color: "var(--danger)" }}
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Mobile tab switcher */}
        <div
          className="flex lg:hidden mb-3 gap-1 p-1 rounded-lg border"
          style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-color)" }}
          role="tablist"
        >
          <button
            onClick={() => setMobileView("editor")}
            role="tab"
            aria-selected={mobileView === "editor"}
            className="flex-1 py-2 rounded-md text-xs font-semibold transition-all"
            style={{
              backgroundColor: mobileView === "editor" ? "var(--accent)" : "transparent",
              color: mobileView === "editor" ? "#fff" : "var(--text-muted)",
            }}
          >
            Code Editor
          </button>
          <button
            onClick={() => setMobileView("results")}
            role="tab"
            aria-selected={mobileView === "results"}
            className="flex-1 py-2 rounded-md text-xs font-semibold transition-all relative"
            style={{
              backgroundColor: mobileView === "results" ? "var(--accent)" : "transparent",
              color: mobileView === "results" ? "#fff" : "var(--text-muted)",
            }}
          >
            Results
            {review && (
              <span
                className="absolute top-1 right-2 w-2 h-2 rounded-full"
                style={{ backgroundColor: mobileView === "results" ? "#fff" : "var(--accent)" }}
              />
            )}
          </button>
        </div>

        {/* Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6" style={{ minHeight: "calc(100vh - 280px)" }}>
          <div className={`flex flex-col ${mobileView !== "editor" ? "hidden lg:flex" : "flex"}`} role="tabpanel">
            <CodeEditor value={code} onChange={setCode} language={language} disabled={loading} />
          </div>
          <div className={`flex flex-col ${mobileView !== "results" ? "hidden lg:flex" : "flex"}`} role="tabpanel">
            <ReviewResults data={review} loading={loading} />
          </div>
        </div>
      </main>

      {/* ===== Footer ===== */}
      <footer className="border-t py-4 mt-auto" style={{ borderColor: "var(--border-subtle)" }}>
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            CodeLens
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            
          </p>
        </div>
      </footer>
    </div>
  );
}
