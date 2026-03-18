// src/lib/ai-reviewer.ts
// Server-side only — uses the Anthropic SDK and API key.
// NEVER import this file from client components.

import Anthropic from "@anthropic-ai/sdk";
import type { SupportedLanguage, DifficultyLevel } from "./validation";

/**
 * Initialize Anthropic client.
 * The API key is read from ANTHROPIC_API_KEY env var.
 */
function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set. Add it to .env.local");
  }
  return new Anthropic({ apiKey });
}

/**
 * Shape of each issue found during review.
 */
export interface ReviewIssue {
  type: "bug" | "style" | "performance" | "security";
  severity: "low" | "medium" | "high" | "critical";
  line?: number;
  title: string;
  explanation: string;
  suggestion: string;
  fixedCode?: string;
}

/**
 * Full review response from the AI.
 */
export interface ReviewResult {
  summary: string;
  issues: ReviewIssue[];
  overallScore: number;
  languageDetected: string;
}

/**
 * Builds VERY different system prompts based on difficulty level.
 *
 * BEGINNER mode:
 * - Uses simple, everyday language
 * - Explains concepts from scratch (assumes no prior knowledge)
 * - Uses analogies and real-world comparisons
 * - Limits to top 5 most important issues
 * - Provides complete corrected code for every issue
 * - Encouraging, supportive tone
 *
 * ADVANCED mode:
 * - Uses precise technical terminology
 * - References OWASP, SOLID, Big-O, design patterns
 * - Covers subtle issues (race conditions, timing attacks, edge cases)
 * - No limit on issues — lists everything found
 * - May provide partial code fixes or just describe the approach
 * - Direct, professional tone
 */
function buildSystemPrompt(difficulty: DifficultyLevel): string {
  const jsonSchema = `
{
  "summary": "string — 2-3 sentence overview of the code quality",
  "issues": [
    {
      "type": "bug" | "style" | "performance" | "security",
      "severity": "low" | "medium" | "high" | "critical",
      "line": number | null,
      "title": "Short issue title",
      "explanation": "What the problem is and why it matters",
      "suggestion": "How to fix it",
      "fixedCode": "The corrected code snippet, or null"
    }
  ],
  "overallScore": 0-100,
  "languageDetected": "language name"
}`;

  if (difficulty === "beginner") {
    return `You are a friendly, patient coding mentor reviewing a student's code. Your job is to help them learn and improve.

RESPONSE FORMAT: Return ONLY valid JSON matching this schema (no markdown, no backticks, no extra text):
${jsonSchema}

YOUR APPROACH FOR BEGINNER PROGRAMMERS:
1. LANGUAGE: Use simple, everyday words. NO jargon without explaining it first. Instead of "null pointer dereference", say "trying to use something that doesn't exist yet (like opening an empty box)".

2. ANALOGIES: Use real-world comparisons for every concept:
   - Variables = labeled containers
   - Functions = recipes
   - Loops = assembly lines
   - If/else = road forks
   - Arrays = numbered mailboxes
   - Try/catch = safety nets

3. TONE: Warm, encouraging, supportive. Start the summary with something positive about their code. Use phrases like "Great start!", "You're on the right track", "One small improvement here".

4. ISSUE LIMIT: Pick only the TOP 5 most impactful issues. Skip nitpicky style issues. Focus on things that would actually break the code or cause confusion.

5. EXPLANATIONS: For each issue, explain:
   - What happens when this code runs (the concrete problem)
   - Why it matters in simple terms
   - A clear, step-by-step way to fix it

6. FIXED CODE: ALWAYS provide fixedCode for every issue. Show the complete corrected version so they can see exactly what to change.

7. SCORING: Be generous but honest. Working code with style issues = 60-75. Working code with minor bugs = 50-65. Broken code = 20-45.

8. SUMMARY: Write the summary as if you're talking to a friend. Example: "Nice work getting started with this function! There are a few things we can fix to make it work better. The main thing is..."`;
  }

  // ADVANCED mode
  return `You are a senior staff engineer conducting a thorough code review. Be precise, technical, and comprehensive.

RESPONSE FORMAT: Return ONLY valid JSON matching this schema (no markdown, no backticks, no extra text):
${jsonSchema}

YOUR APPROACH FOR ADVANCED DEVELOPERS:
1. LANGUAGE: Use precise technical terminology. Reference specific concepts:
   - Design patterns (Singleton, Factory, Observer, Strategy)
   - SOLID principles (which one is violated and why)
   - OWASP Top 10 categories for security issues
   - Big-O complexity for performance issues (O(n^2) vs O(n log n))
   - Language-specific idioms and best practices

2. DEPTH: Go deep on each issue:
   - Explain the root cause, not just the symptom
   - Describe edge cases that would trigger the bug
   - For security issues, describe the attack vector
   - For performance issues, explain the bottleneck with complexity analysis
   - Reference relevant RFCs, language specs, or well-known resources

3. TONE: Direct, professional, constructive. No sugar-coating, but not harsh either. Like a respected senior colleague in a PR review.

4. COMPREHENSIVENESS: List ALL issues found. Do not limit yourself. Include:
   - Bugs (null refs, off-by-one, race conditions, type mismatches)
   - Style (naming conventions, dead code, magic numbers, code duplication)
   - Performance (unnecessary allocations, O(n^2) loops, missing caching, blocking I/O)
   - Security (injection, XSS, CSRF, insecure deserialization, hardcoded secrets, timing attacks, path traversal)

5. FIXED CODE: Provide fixedCode when the fix is non-obvious. For simple fixes (e.g., rename a variable), a clear description in the suggestion is sufficient.

6. SCORING: Be rigorous. Deduct heavily for:
   - Security vulnerabilities (critical = -20, high = -15)
   - Bugs that would cause runtime errors (-10 to -15 each)
   - Performance issues with O(n^2) or worse (-5 to -10)
   - Style issues (-1 to -3 each)
   Score 90+ only for genuinely excellent code with no significant issues.

7. SUMMARY: Be direct and specific. Example: "This implementation has a SQL injection vulnerability in the query builder and an O(n^2) sorting loop that will degrade at scale. The core logic is sound but needs hardening before production use."`;
}

/**
 * Sends code to Claude for review and parses the structured response.
 */
export async function reviewCode(
  code: string,
  language: SupportedLanguage,
  difficulty: DifficultyLevel
): Promise<ReviewResult> {
  const client = getClient();

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `Review this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\``,
      },
    ],
    system: buildSystemPrompt(difficulty),
  });

  // Extract text content from the response
  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from AI");
  }

  // Parse and validate the JSON response
  let parsed: ReviewResult;
  try {
    // Strip markdown fences if the model includes them despite instructions
    let cleaned = textBlock.text.trim();
    // Remove ```json ... ``` wrapping
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
    }
    parsed = JSON.parse(cleaned);
  } catch {
    console.error("[ai-reviewer] Failed to parse response:", textBlock.text.substring(0, 200));
    throw new Error("Failed to parse AI response as JSON");
  }

  // Basic shape validation
  if (
    typeof parsed.summary !== "string" ||
    !Array.isArray(parsed.issues) ||
    typeof parsed.overallScore !== "number"
  ) {
    throw new Error("AI response has unexpected shape");
  }

  // Clamp score to valid range
  parsed.overallScore = Math.max(0, Math.min(100, Math.round(parsed.overallScore)));

  // Validate each issue has required fields
  parsed.issues = parsed.issues.filter(
    (issue) =>
      issue &&
      typeof issue.type === "string" &&
      typeof issue.title === "string" &&
      typeof issue.explanation === "string" &&
      typeof issue.suggestion === "string"
  );

  // Ensure languageDetected exists
  if (!parsed.languageDetected) {
    parsed.languageDetected = language;
  }

  return parsed;
}