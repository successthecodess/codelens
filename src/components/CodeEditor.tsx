// src/components/CodeEditor.tsx
"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import type { SupportedLanguage } from "@/lib/validation";

interface Props {
  value: string;
  onChange: (value: string) => void;
  language: SupportedLanguage;
  disabled: boolean;
}

// Max file size: 100KB
const MAX_FILE_SIZE = 100_000;
const ALLOWED_EXTENSIONS = /\.(py|js|ts|jsx|tsx|java|mjs|cjs|txt)$/i;

export default function CodeEditor({ value, onChange, language, disabled }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  // Clear upload status after 3 seconds
  useEffect(() => {
    if (uploadStatus) {
      const timer = setTimeout(() => setUploadStatus(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [uploadStatus]);

  // Tab key inserts spaces instead of changing focus
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const textarea = textareaRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = value.substring(0, start) + "  " + value.substring(end);
        onChange(newValue);
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        });
      }
    },
    [value, onChange]
  );

  // Read a file and set it as the code value
  const readFile = useCallback(
    (file: File) => {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        setUploadStatus(`File too large (${(file.size / 1024).toFixed(1)}KB). Max is 100KB.`);
        return;
      }

      // Validate file type — accept text files and common code extensions
      const isTextType = file.type.startsWith("text/") || file.type === "application/javascript" || file.type === "";
      const hasValidExtension = ALLOWED_EXTENSIONS.test(file.name);

      if (!isTextType && !hasValidExtension) {
        setUploadStatus(`Unsupported file: ${file.name}. Upload a code file (.py, .js, .java, etc.)`);
        return;
      }

      const reader = new FileReader();

      reader.onload = (event) => {
        const content = event.target?.result;
        if (typeof content === "string") {
          onChange(content);
          setUploadStatus(`Loaded: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`);
        }
      };

      reader.onerror = () => {
        setUploadStatus("Failed to read file. Please try again.");
      };

      reader.readAsText(file);
    },
    [onChange]
  );

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set false if we're leaving the container (not entering a child)
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        readFile(files[0]);
      }
    },
    [readFile]
  );

  // File input change handler
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        readFile(files[0]);
      }
      // Reset the input so the same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [readFile]
  );

  // Click handler for the upload button
  const handleUploadClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  const placeholders: Record<SupportedLanguage, string> = {
    python: "# Paste your Python code here...\ndef example():\n    pass",
    javascript: "// Paste your JavaScript code here...\nfunction example() {\n  \n}",
    java: "// Paste your Java code here...\npublic class Example {\n    \n}",
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-3 py-2 rounded-t-xl border border-b-0"
        style={{
          backgroundColor: "var(--bg-tertiary)",
          borderColor: "var(--border-color)",
        }}
      >
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-400/80" />
          <span className="w-3 h-3 rounded-full bg-yellow-400/80" />
          <span className="w-3 h-3 rounded-full bg-green-400/80" />
          <span
            className="ml-3 text-xs font-medium uppercase tracking-wider"
            style={{ color: "var(--text-muted)", fontFamily: "monospace" }}
          >
            {language}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Upload status message */}
          {uploadStatus && (
            <span
              className="text-[11px] font-medium truncate max-w-[200px]"
              style={{ color: uploadStatus.startsWith("Loaded") ? "var(--accent)" : "var(--danger)" }}
            >
              {uploadStatus}
            </span>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".py,.js,.ts,.jsx,.tsx,.java,.mjs,.cjs,.txt"
            onChange={handleFileSelect}
            className="hidden"
            aria-label="Upload code file"
          />

          {/* Upload button */}
          <button
            type="button"
            onClick={handleUploadClick}
            disabled={disabled}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-40 cursor-pointer"
            style={{
              backgroundColor: "var(--bg-secondary)",
              color: "var(--text-secondary)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>Upload File</span>
          </button>

          {/* Clear button */}
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              disabled={disabled}
              className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-40"
              style={{
                backgroundColor: "var(--bg-secondary)",
                color: "var(--text-muted)",
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Editor area */}
      <div
        className={`relative flex-1 rounded-b-xl border overflow-hidden ${isDragging ? "ring-2" : ""}`}
        style={{
          borderColor: isDragging ? "var(--accent)" : "var(--border-color)",
          
        }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Actual textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholders[language]}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          className="custom-scrollbar w-full h-full p-4 resize-none border-0 outline-none"
          style={{
            backgroundColor: "var(--bg-code)",
            color: "var(--text-primary)",
            caretColor: "var(--accent)",
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
            fontSize: "13px",
            lineHeight: "1.7",
            minHeight: "300px",
            tabSize: 2,
          }}
        />

        {/* Drag overlay */}
        {isDragging && (
          <div
            className="absolute inset-0 flex items-center justify-center z-10"
            style={{ backgroundColor: "var(--overlay)" }}
          >
            <div className="text-center animate-fade-up p-6 rounded-xl" style={{ backgroundColor: "var(--card-bg)" }}>
              <svg
                className="mx-auto mb-3"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="1.5"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
                Drop your code file here
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                .py, .js, .ts, .java, .txt (max 100KB)
              </p>
            </div>
          </div>
        )}

        {/* Empty state hint */}
        {!value && !isDragging && (
          <div
            className="absolute bottom-4 left-4 right-4 text-center pointer-events-none"
            style={{ color: "var(--text-muted)" }}
          >
            <p className="text-xs">
              Drag & drop a file, click Upload, or paste code directly
            </p>
          </div>
        )}
      </div>
    </div>
  );
}