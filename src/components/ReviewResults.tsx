"use client";

import { useState, useCallback } from "react";
import CopyButton from "./CopyButton";

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

interface Props {
  data: ReviewData | null;
  loading: boolean;
}

const TYPE_CONFIG = {
  bug: { label: "Bug", color: "#f87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.2)", icon: "🐛" },
  style: { label: "Style", color: "#60a5fa", bg: "rgba(96,165,250,0.08)", border: "rgba(96,165,250,0.2)", icon: "🎨" },
  performance: { label: "Perf", color: "#fbbf24", bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.2)", icon: "⚡" },
  security: { label: "Security", color: "#c084fc", bg: "rgba(192,132,252,0.08)", border: "rgba(192,132,252,0.2)", icon: "🔒" },
};

const SEVERITY_COLORS: Record<string, string> = {
  low: "#6b7280",
  medium: "#f59e0b",
  high: "#f97316",
  critical: "#ef4444",
};

// ============================================================
// Score Ring Component
// ============================================================
function ScoreRing({ score }: { score: number }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "var(--accent)" : score >= 60 ? "var(--warning)" : "var(--danger)";

  return (
    <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0">
      <svg
        className="w-full h-full -rotate-90"
        viewBox="0 0 100 100"
        role="img"
        aria-label={`Code quality score: ${score} out of 100`}
      >
        <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--score-ring-bg)" strokeWidth="7" />
        <circle
          cx="50" cy="50" r={radius} fill="none"
          stroke={color} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ animation: "score-fill 1s ease-out forwards", strokeDashoffset: offset }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl sm:text-3xl font-bold" style={{ color }}>{score}</span>
        <span className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: "var(--text-muted)" }}>
          Score
        </span>
      </div>
    </div>
  );
}

// ============================================================
// Loading Skeleton
// ============================================================
function LoadingSkeleton() {
  return (
    <div
      className="h-full min-h-[300px] sm:min-h-[400px] rounded-xl border flex flex-col items-center justify-center"
      style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}
    >
      <div className="text-center space-y-4 px-6">
        <div className="relative w-14 h-14 mx-auto">
          <div className="absolute inset-0 rounded-full border-2" style={{ borderColor: "var(--border-color)" }} />
          <div
            className="absolute inset-0 rounded-full border-2 animate-spin"
            style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
          />
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            Analyzing your code...
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Checking bugs, style, performance &amp; security
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Issue Card Component
// ============================================================
function IssueCard({ issue }: { issue: ReviewIssue }) {
  const [expanded, setExpanded] = useState(false);
  const config = TYPE_CONFIG[issue.type];

  return (
    <div
      className="rounded-lg border overflow-hidden transition-all"
      style={{ backgroundColor: config.bg, borderColor: config.border }}
      role="region"
      aria-label={`${config.label} issue: ${issue.title}`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-3 text-left transition-colors hover:opacity-90"
        aria-expanded={expanded}
      >
        <span className="text-base sm:text-lg flex-shrink-0" aria-hidden="true">{config.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-xs sm:text-sm font-semibold" style={{ color: config.color }}>
              {issue.title}
            </span>
            {issue.line != null && (
              <span
                className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-muted)" }}
              >
                Line {issue.line}
              </span>
            )}
          </div>
        </div>
        <span
          className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full text-white flex-shrink-0"
          style={{ backgroundColor: SEVERITY_COLORS[issue.severity] }}
        >
          {issue.severity}
        </span>
        <svg
          className="w-4 h-4 flex-shrink-0 transition-transform duration-200"
          style={{ color: "var(--text-muted)", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-3 sm:px-4 pb-4 space-y-3 border-t" style={{ borderColor: config.border }}>
          <div className="pt-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
              What&apos;s Wrong
            </h4>
            <p className="text-xs sm:text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {issue.explanation}
            </p>
          </div>
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
              How to Fix
            </h4>
            <p className="text-xs sm:text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {issue.suggestion}
            </p>
          </div>
          {issue.fixedCode && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  Corrected Code
                </h4>
                <CopyButton text={issue.fixedCode} label="Copy Fix" />
              </div>
              <pre
                className="p-3 rounded-lg text-xs overflow-x-auto custom-scrollbar"
                style={{
                  backgroundColor: "var(--bg-code)",
                  color: "var(--accent)",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                <code>{issue.fixedCode}</code>
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// PDF Export — text-based using jsPDF (not screenshot)
// Produces a clean, properly formatted multi-page PDF
// ============================================================
async function generatePdf(data: ReviewData) {
  const { default: jsPDF } = await import("jspdf");

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const checkPageBreak = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }
  };

  // Helper: wrap text and return lines
  const wrapText = (text: string, maxWidth: number, fontSize: number): string[] => {
    pdf.setFontSize(fontSize);
    return pdf.splitTextToSize(text, maxWidth);
  };

  // ---- Header ----
  pdf.setFillColor(16, 185, 129); // emerald-500
  pdf.rect(0, 0, pageWidth, 35, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(22);
  pdf.setFont("helvetica", "bold");
  pdf.text("CodeLens Code Review", margin, 18);

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(
    `Generated on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}`,
    margin, 28
  );

  y = 45;

  // ---- Score Section ----
  const scoreColor = data.overallScore >= 80 ? [16, 185, 129] : data.overallScore >= 60 ? [245, 158, 11] : [239, 68, 68];

  // Score circle
  pdf.setDrawColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  pdf.setLineWidth(1.5);
  pdf.circle(margin + 15, y + 12, 12);
  pdf.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  pdf.setFontSize(20);
  pdf.setFont("helvetica", "bold");
  pdf.text(String(data.overallScore), margin + 15, y + 14, { align: "center" });

  pdf.setFontSize(7);
  pdf.setTextColor(120, 120, 120);
  pdf.text("/ 100", margin + 15, y + 19, { align: "center" });

  // Language badge
  pdf.setTextColor(80, 80, 80);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Language: ${data.languageDetected}`, margin + 35, y + 5);

  // Issue count
  const issueText = data.issues.length === 0 ? "No issues found!" : `${data.issues.length} issue${data.issues.length !== 1 ? "s" : ""} found`;
  pdf.text(issueText, margin + 35, y + 11);

  y += 30;

  // ---- Summary ----
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.3);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 8;

  pdf.setTextColor(40, 40, 40);
  pdf.setFontSize(13);
  pdf.setFont("helvetica", "bold");
  pdf.text("Summary", margin, y);
  y += 7;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(60, 60, 60);
  const summaryLines = wrapText(data.summary, contentWidth, 10);
  for (const line of summaryLines) {
    checkPageBreak(6);
    pdf.text(line, margin, y);
    y += 5;
  }

  y += 8;

  // ---- Issues ----
  if (data.issues.length > 0) {
    checkPageBreak(15);
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 8;

    pdf.setTextColor(40, 40, 40);
    pdf.setFontSize(13);
    pdf.setFont("helvetica", "bold");
    pdf.text("Issues", margin, y);
    y += 8;

    const severityColorMap: Record<string, number[]> = {
      critical: [239, 68, 68],
      high: [249, 115, 22],
      medium: [245, 158, 11],
      low: [107, 114, 128],
    };

    const typeIconMap: Record<string, string> = {
      bug: "BUG",
      style: "STYLE",
      performance: "PERF",
      security: "SEC",
    };

    for (let i = 0; i < data.issues.length; i++) {
      const issue = data.issues[i];
     

      checkPageBreak(40);

      // Issue header background
      pdf.setFillColor(245, 245, 245);
      pdf.roundedRect(margin, y - 3, contentWidth, 10, 2, 2, "F");

      // Type badge
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(100, 100, 100);
      pdf.text(typeIconMap[issue.type] || issue.type.toUpperCase(), margin + 3, y + 3);

      // Severity badge
      const sevColor = severityColorMap[issue.severity] || [107, 114, 128];
      pdf.setFillColor(sevColor[0], sevColor[1], sevColor[2]);
      pdf.roundedRect(margin + 18, y - 1, 18, 6, 1, 1, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(6);
      pdf.text(issue.severity.toUpperCase(), margin + 19, y + 3);

      // Title
      pdf.setTextColor(40, 40, 40);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      const titleX = margin + 40;
      const titleMaxWidth = contentWidth - 45;
      const titleLines = wrapText(issue.title, titleMaxWidth, 10);
      pdf.text(titleLines[0] || issue.title, titleX, y + 4);

      // Line number
      if (issue.line != null) {
        pdf.setFontSize(7);
        pdf.setTextColor(140, 140, 140);
        pdf.setFont("helvetica", "normal");
        pdf.text(`Line ${issue.line}`, pageWidth - margin - 15, y + 4);
      }

      y += 12;

      // Explanation
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text("WHAT'S WRONG:", margin + 3, y);
      y += 5;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(70, 70, 70);
      const explanationLines = wrapText(issue.explanation, contentWidth - 6, 9);
      for (const line of explanationLines) {
        checkPageBreak(5);
        pdf.text(line, margin + 3, y);
        y += 4.5;
      }
      y += 3;

      // Suggestion
      checkPageBreak(10);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text("HOW TO FIX:", margin + 3, y);
      y += 5;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(70, 70, 70);
      const suggestionLines = wrapText(issue.suggestion, contentWidth - 6, 9);
      for (const line of suggestionLines) {
        checkPageBreak(5);
        pdf.text(line, margin + 3, y);
        y += 4.5;
      }
      y += 3;

      // Fixed code
      if (issue.fixedCode) {
        checkPageBreak(15);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        pdf.text("CORRECTED CODE:", margin + 3, y);
        y += 5;

        // Code background
        const codeLines = wrapText(issue.fixedCode, contentWidth - 10, 8);
        const codeBlockHeight = codeLines.length * 4 + 6;
        checkPageBreak(codeBlockHeight);

        pdf.setFillColor(30, 30, 46);
        pdf.roundedRect(margin + 2, y - 3, contentWidth - 4, codeBlockHeight, 2, 2, "F");

        pdf.setFont("courier", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(52, 211, 153); // emerald-400
        for (const line of codeLines) {
          pdf.text(line, margin + 5, y + 1);
          y += 4;
        }
        y += 5;
      }

      // Separator between issues
      if (i < data.issues.length - 1) {
        y += 3;
        checkPageBreak(5);
        pdf.setDrawColor(220, 220, 220);
        pdf.setLineWidth(0.2);
        pdf.line(margin + 10, y, pageWidth - margin - 10, y);
        y += 6;
      }
    }
  }

  // ---- Footer on last page ----
  pdf.setTextColor(160, 160, 160);
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.text("Generated by CodeLens - AI Code Review", pageWidth / 2, pageHeight - 10, { align: "center" });

  pdf.save(`codelens-review-${Date.now()}.pdf`);
}

// ============================================================
// Share — copies plain text summary to clipboard
// ============================================================
function ShareButton({ data }: { data: ReviewData }) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    const lines: string[] = [
      `CodeLens Review -- Score: ${data.overallScore}/100`,
      `Language: ${data.languageDetected}`,
      "",
      data.summary,
      "",
    ];

    if (data.issues.length > 0) {
      lines.push(`Issues Found (${data.issues.length}):`);
      data.issues.forEach((issue, i) => {
        const lineRef = issue.line != null ? ` (line ${issue.line})` : "";
        lines.push(`  ${i + 1}. [${issue.severity.toUpperCase()}] ${issue.title}${lineRef}`);
      });
    } else {
      lines.push("No issues found!");
    }

    lines.push("", "-- Generated by CodeLens");

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // silent fail
    }
  }, [data]);

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
      style={{
        backgroundColor: copied ? "var(--accent)" : "var(--bg-secondary)",
        color: copied ? "#fff" : "var(--text-secondary)",
      }}
      aria-label="Copy review summary to clipboard"
    >
      {copied ? (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="hidden sm:inline">Copied!</span>
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          <span className="hidden sm:inline">Share</span>
        </>
      )}
    </button>
  );
}

// ============================================================
// Main ReviewResults Component
// ============================================================
export default function ReviewResults({ data, loading }: Props) {
  const [exporting, setExporting] = useState(false);

  const handleExportPdf = useCallback(async () => {
    if (!data) return;
    setExporting(true);
    try {
      await generatePdf(data);
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("PDF export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  }, [data]);

  if (loading) return <LoadingSkeleton />;

  if (!data) {
    return (
      <div
        className="h-full min-h-[300px] sm:min-h-[400px] rounded-xl border flex items-center justify-center"
        style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}
      >
        <div className="text-center space-y-3 px-6">
          <div className="text-4xl">🔍</div>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Paste code and click{" "}
            <span className="font-semibold" style={{ color: "var(--accent)" }}>Review Code</span>{" "}
            to get started
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Ctrl+Enter / Cmd+Enter for quick review
          </p>
        </div>
      </div>
    );
  }

  const issueCounts = data.issues.reduce(
    (acc, issue) => {
      acc[issue.type] = (acc[issue.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-3 py-2 rounded-t-xl border border-b-0"
        style={{ backgroundColor: "var(--bg-tertiary)", borderColor: "var(--border-color)" }}
      >
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          Review Report
        </span>
        <div className="flex items-center gap-1.5">
          <ShareButton data={data} />
          <button
            onClick={handleExportPdf}
            disabled={exporting}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors disabled:opacity-40"
            style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-secondary)" }}
            aria-label="Export review as PDF"
          >
            {exporting ? (
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            )}
            <span>{exporting ? "Exporting..." : "PDF"}</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        className="flex-1 rounded-b-xl border overflow-y-auto custom-scrollbar"
        style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}
      >
        <div className="p-4 sm:p-5 space-y-4 stagger-children">
          {/* Score + Summary */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <ScoreRing score={data.overallScore} />
            <div className="flex-1 text-center sm:text-left">
              <p className="text-xs sm:text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {data.summary}
              </p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 sm:gap-3 mt-3">
                {Object.entries(issueCounts).map(([type, count]) => {
                  const config = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG];
                  if (!config) return null;
                  return (
                    <span
                      key={type}
                      className="text-[11px] sm:text-xs font-semibold flex items-center gap-1 px-2 py-0.5 rounded-full"
                      style={{ color: config.color, backgroundColor: config.bg }}
                    >
                      {config.icon} {count} {config.label}
                    </span>
                  );
                })}
                {data.issues.length === 0 && (
                  <span className="text-xs font-semibold" style={{ color: "var(--accent)" }}>
                    No issues found!
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Issues */}
          {data.issues.map((issue, index) => (
            <IssueCard key={`${issue.type}-${issue.line}-${index}`} issue={issue} />
          ))}
        </div>
      </div>
    </div>
  );
}