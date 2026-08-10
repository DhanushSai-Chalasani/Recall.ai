/**
 * In-memory sliding window rate limiter for API endpoints.
 * 
 * For production with multiple serverless instances, replace with
 * Upstash Redis or Vercel KV for distributed rate limiting.
 * 
 * Usage:
 *   import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
 *   
 *   if (!rateLimit(user.id, RATE_LIMITS.PROCESS_AUDIO)) {
 *     return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
 *   }
 */

interface RateLimitEntry {
  timestamps: number[];
}

interface RateLimitConfig {
  /** Maximum number of requests allowed within the window */
  limit: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Human-readable name for logging */
  name: string;
}

// In-memory store (per serverless instance)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupStaleEntries(windowMs: number): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, entry] of rateLimitStore.entries()) {
    const validTimestamps = entry.timestamps.filter((t) => now - t < windowMs);
    if (validTimestamps.length === 0) {
      rateLimitStore.delete(key);
    } else {
      entry.timestamps = validTimestamps;
    }
  }
}

/**
 * Check if a request is within rate limits.
 * Uses a sliding window algorithm for accurate rate limiting.
 * 
 * @param userId - The unique identifier for the user
 * @param config - Rate limit configuration
 * @returns Object with `allowed` boolean and `retryAfterMs` if blocked
 */
export function rateLimit(
  userId: string,
  config: RateLimitConfig
): { allowed: boolean; retryAfterMs: number; remaining: number } {
  const { limit, windowMs, name } = config;
  const key = `${name}:${userId}`;
  const now = Date.now();

  // Periodic cleanup
  cleanupStaleEntries(windowMs);

  // Get or create entry
  let entry = rateLimitStore.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    rateLimitStore.set(key, entry);
  }

  // Filter to only timestamps within the current window
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= limit) {
    // Rate limited — calculate when the oldest request in the window expires
    const oldestTimestamp = entry.timestamps[0];
    const retryAfterMs = oldestTimestamp + windowMs - now;
    console.warn(
      `[Rate Limit] User ${userId} blocked on "${name}". ` +
      `${entry.timestamps.length}/${limit} requests in ${windowMs / 1000}s window. ` +
      `Retry after ${Math.ceil(retryAfterMs / 1000)}s.`
    );
    return { allowed: false, retryAfterMs, remaining: 0 };
  }

  // Allow the request
  entry.timestamps.push(now);
  const remaining = limit - entry.timestamps.length;
  return { allowed: true, retryAfterMs: 0, remaining };
}

/**
 * Pre-configured rate limit profiles for each endpoint.
 * Adjust these values based on your API cost tolerance and user expectations.
 */
export const RATE_LIMITS = {
  /** Audio processing: 3 requests per hour (expensive: Groq + NVIDIA + HuggingFace) */
  PROCESS_AUDIO: {
    limit: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    name: "process-audio",
  },

  /** Vault semantic search: 10 requests per minute (moderate: HuggingFace + NVIDIA) */
  VAULT_SEARCH: {
    limit: 10,
    windowMs: 60 * 1000, // 1 minute
    name: "vault-search",
  },

  /** Bot scheduling: 5 requests per hour (expensive: Playwright + Gemini) */
  BOT_SCHEDULE: {
    limit: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
    name: "bot-schedule",
  },

  /** Google Docs export: 10 per hour */
  EXPORT: {
    limit: 10,
    windowMs: 60 * 60 * 1000,
    name: "export",
  },

  /** Account actions: 5 per minute (prevent brute-force) */
  ACCOUNT: {
    limit: 5,
    windowMs: 60 * 1000,
    name: "account",
  },
} as const;
