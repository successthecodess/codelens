// src/components/DifficultyToggle.tsx
"use client";

import type { DifficultyLevel } from "@/lib/validation";

interface Props {
  value: DifficultyLevel;
  onChange: (value: DifficultyLevel) => void;
}

export default function DifficultyToggle({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <span
        className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider hidden sm:block"
        style={{ color: "var(--text-muted)" }}
      >
        Level
      </span>
      <div
        className="relative inline-flex items-center h-9 rounded-lg border overflow-hidden"
        style={{
          backgroundColor: "var(--bg-secondary)",
          borderColor: "var(--border-color)",
        }}
        role="radiogroup"
        aria-label="Feedback difficulty level"
      >
        <button
          onClick={() => onChange("beginner")}
          role="radio"
          aria-checked={value === "beginner"}
          className="relative z-10 px-3 sm:px-4 h-full text-xs font-semibold transition-all duration-200"
          style={{
            backgroundColor: value === "beginner" ? "var(--accent)" : "transparent",
            color: value === "beginner" ? "#fff" : "var(--text-muted)",
            borderRadius: "7px",
          }}
        >
          🟢 Beginner
        </button>
        <button
          onClick={() => onChange("advanced")}
          role="radio"
          aria-checked={value === "advanced"}
          className="relative z-10 px-3 sm:px-4 h-full text-xs font-semibold transition-all duration-200"
          style={{
            backgroundColor: value === "advanced" ? "#ef4444" : "transparent",
            color: value === "advanced" ? "#fff" : "var(--text-muted)",
            borderRadius: "7px",
          }}
        >
          🔴 Advanced
        </button>
      </div>
    </div>
  );
}