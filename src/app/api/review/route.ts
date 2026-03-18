// src/app/api/review/route.ts
import { NextRequest, NextResponse } from "next/server";
import { codeReviewSchema, sanitizeCode } from "@/lib/validation";
import { rateLimiter } from "@/lib/rate-limiter";
import { reviewCode } from "@/lib/ai-reviewer";
import { z } from "zod";

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || "unknown";
}

function securityHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Cache-Control": "no-store, no-cache, must-revalidate",
  };
}

export async function POST(request: NextRequest) {
  console.log("[/api/review] Request received");
  const headers = securityHeaders();

  try {
    // 1. Rate Limiting
    const clientIp = getClientIp(request);
    const rateResult = rateLimiter.check(clientIp);

    headers["X-RateLimit-Remaining"] = String(rateResult.remaining);
    headers["X-RateLimit-Reset"] = String(Math.ceil(rateResult.resetMs / 1000));

    if (!rateResult.allowed) {
      const retryAfter = Math.ceil(rateResult.resetMs / 1000);
      headers["Retry-After"] = String(retryAfter);
      return NextResponse.json(
        { error: "Too many requests. Please wait before trying again.", retryAfterSeconds: retryAfter },
        { status: 429, headers }
      );
    }

    // 2. Content-Type Validation
    const contentType = request.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      return NextResponse.json(
        { error: "Content-Type must be application/json" },
        { status: 415, headers }
      );
    }

    // 3. Parse Request Body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400, headers }
      );
    }

    console.log("[/api/review] Body parsed, validating...");

    // 4. Schema Validation
    const validated = codeReviewSchema.parse(body);

    console.log("[/api/review] Validation passed, language:", validated.language);

    // 5. Sanitize Input
    const sanitizedCode = sanitizeCode(validated.code);

    // 6. Call AI Reviewer
    const result = await reviewCode(
      sanitizedCode,
      validated.language,
      validated.difficulty
    );

    console.log("[/api/review] Review complete, returning result");

    return NextResponse.json(
      { success: true, data: result },
      { status: 200, headers }
    );
  } catch (error) {
    // Zod validation errors
    if (error instanceof z.ZodError) {
      const issues = "issues" in error ? error.issues : [];
      const fieldErrors = issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return NextResponse.json(
        { error: "Validation failed", details: fieldErrors },
        { status: 400, headers }
      );
    }

    // Log the full error server-side
    console.error("[/api/review] INTERNAL ERROR:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: "An internal error occurred. Please try again later." },
      { status: 500, headers }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST." },
    { status: 405, headers: securityHeaders() }
  );
}