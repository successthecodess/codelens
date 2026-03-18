"use client";

import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/lib/validation";

interface Props {
  value: SupportedLanguage;
  onChange: (value: SupportedLanguage) => void;
}

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  python: "Python",
  javascript: "JavaScript",
  java: "Java",
};

const LANGUAGE_SHORT: Record<SupportedLanguage, string> = {
  python: "PY",
  javascript: "JS",
  java: "JV",
};

const LANGUAGE_ICONS: Record<SupportedLanguage, string> = {
  python: "🐍",
  javascript: "⚡",
  java: "☕",
};

export default function LanguageSelector({ value, onChange }: Props) {
  return (
    <div
      className="inline-flex items-center gap-0.5 p-1 rounded-lg border"
      style={{
        backgroundColor: "var(--bg-secondary)",
        borderColor: "var(--border-color)",
      }}
    >
      {SUPPORTED_LANGUAGES.map((lang) => {
        const isActive = value === lang;
        return (
          <button
            key={lang}
            onClick={() => onChange(lang)}
            className="px-2.5 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-1 sm:gap-1.5"
            style={{
              backgroundColor: isActive ? "var(--accent)" : "transparent",
              color: isActive ? "#fff" : "var(--text-secondary)",
            }}
          >
            <span>{LANGUAGE_ICONS[lang]}</span>
            {/* Full name on desktop, abbreviation on mobile */}
            <span className="hidden sm:inline">{LANGUAGE_LABELS[lang]}</span>
            <span className="sm:hidden">{LANGUAGE_SHORT[lang]}</span>
          </button>
        );
      })}
    </div>
  );
}