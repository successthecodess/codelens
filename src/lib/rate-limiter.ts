interface RateLimitEntry {
  timestamps: number[];
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;

    if (typeof setInterval !== "undefined") {
      setInterval(() => this.cleanup(), 60_000);
    }
  }

  check(key: string): {
    allowed: boolean;
    remaining: number;
    resetMs: number;
  } {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const entry = this.store.get(key) || { timestamps: [] };
    entry.timestamps = entry.timestamps.filter(
      (t: number) => t > windowStart
    );

    if (entry.timestamps.length >= this.maxRequests) {
      const oldestInWindow = entry.timestamps[0];
      const resetMs = oldestInWindow + this.windowMs - now;
      return { allowed: false, remaining: 0, resetMs: Math.max(resetMs, 0) };
    }

    entry.timestamps.push(now);
    this.store.set(key, entry);

    return {
      allowed: true,
      remaining: this.maxRequests - entry.timestamps.length,
      resetMs: this.windowMs,
    };
  }

  private cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Use Array.from() to avoid downlevelIteration issue
    const entries = Array.from(this.store.entries());
    for (const [key, entry] of entries) {
      entry.timestamps = entry.timestamps.filter(
        (t: number) => t > windowStart
      );
      if (entry.timestamps.length === 0) {
        this.store.delete(key);
      }
    }
  }
}

const maxRequests = parseInt(
  process.env.RATE_LIMIT_MAX_REQUESTS || "10",
  10
);
const windowMs = parseInt(
  process.env.RATE_LIMIT_WINDOW_MS || "60000",
  10
);

export const rateLimiter = new RateLimiter(maxRequests, windowMs);