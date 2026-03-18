// src/lib/validation.ts
import { z } from "zod";

export const SUPPORTED_LANGUAGES = ["python", "javascript", "java"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DIFFICULTY_LEVELS = ["beginner", "advanced"] as const;
export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

const MAX_CODE_LENGTH = parseInt(
  process.env.MAX_CODE_LENGTH || "15000",
  10
);

// Try both Zod v3 and v4 compatible syntax
export const codeReviewSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, "Code cannot be empty")
      .max(MAX_CODE_LENGTH, `Code cannot exceed ${MAX_CODE_LENGTH} characters`),

    language: z.enum(SUPPORTED_LANGUAGES),

    difficulty: z.enum(DIFFICULTY_LEVELS),
  })
  .strict();

export type CodeReviewInput = z.infer<typeof codeReviewSchema>;

export function sanitizeCode(code: string): string {
  return code
    .replace(/\0/g, "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}