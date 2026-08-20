import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

/**
 * Rate limiting for the auth surface, backed by Upstash Redis.
 *
 * This is a separate control from the per-email send cooldowns in
 * `lib/auth/verification-token` and `lib/auth/password-reset-token`. Those skip
 * a send to protect the *inbox owner* and answer with the same generic 200;
 * these reject the *caller* to protect our own infrastructure and mail quota.
 * Neither subsumes the other — an email cooldown does nothing against one
 * attacker spraying a thousand addresses, and an IP limit does nothing against
 * a botnet burying one real inbox.
 *
 * The four API routes refuse with `rateLimitResponse`, a 429. Sign-in cannot:
 * its check lives in `authorize`, which NextAuth calls, so it throws a
 * `CredentialsSignin` instead and the code becomes a message on `/sign-in`.
 * The check has to sit there rather than in the sign-in Server Action, because
 * a direct POST to `/api/auth/callback/credentials` reaches `authorize` without
 * going anywhere near the form.
 *
 * Every check here fails **open**: an Upstash outage, a missing configuration
 * or a malformed response lets the request through. That is a deliberate choice
 * of availability over enforcement, and it is survivable precisely because the
 * database-backed cooldowns cannot fail open — the request already needs the
 * database to do anything at all.
 */

/**
 * The window is an Upstash `Duration`: a count, a space, then a unit.
 * Sliding rather than fixed, so a window boundary cannot be used to land
 * two full allowances back to back.
 */
export const RATE_LIMITS = {
  signIn: { tokens: 5, window: "15 m" },
  register: { tokens: 3, window: "1 h" },
  forgotPassword: { tokens: 3, window: "1 h" },
  resetPassword: { tokens: 5, window: "15 m" },
  resendVerification: { tokens: 3, window: "15 m" },
} as const;

export type RateLimitName = keyof typeof RATE_LIMITS;

export interface RateLimitResult {
  /** False only when the caller is over the limit and should be refused */
  success: boolean;
  remaining: number;
  /** Epoch milliseconds at which the window frees up */
  reset: number;
  /** Whole seconds until `reset`, floored at 1, for the `Retry-After` header */
  retryAfterSeconds: number;
}

type Limiters = Record<RateLimitName, Ratelimit>;

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

/**
 * Returns null rather than throwing when the credentials are absent, so a
 * deployment without Upstash configured keeps working unlimited instead of
 * failing every auth request at import time.
 */
function createLimiters(): Limiters | null {
  if (!url || !token) {
    return null;
  }

  const redis = new Redis({ url, token });

  const entries = Object.entries(RATE_LIMITS).map(([name, { tokens, window }]) => [
    name,
    new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(tokens, window),
      // Namespaced per limit, so the same IP hitting two endpoints does not
      // share one counter
      prefix: `devstash:ratelimit:${name}`,
      // Saves a round trip for an identifier already known to be blocked
      // within this instance's lifetime
      ephemeralCache: new Map<string, number>(),
    }),
  ]);

  return Object.fromEntries(entries) as Limiters;
}

// Reuse across HMR reloads in development, matching lib/prisma.ts
const globalForRateLimit = globalThis as unknown as {
  rateLimiters?: Limiters | null;
};

function getLimiters(): Limiters | null {
  if (globalForRateLimit.rateLimiters === undefined) {
    globalForRateLimit.rateLimiters = createLimiters();
  }

  return globalForRateLimit.rateLimiters;
}

/** The shape returned whenever the limiter cannot answer. Always permissive. */
function allow(): RateLimitResult {
  return {
    success: true,
    remaining: Number.POSITIVE_INFINITY,
    reset: Date.now(),
    retryAfterSeconds: 0,
  };
}

/**
 * Whether this caller may proceed. Call it *after* input validation and
 * *before* any lookup that depends on the account existing: the counter has to
 * move for every well-formed request regardless of outcome, or a 429 would
 * itself become proof that an address has an account.
 */
export async function checkRateLimit(
  name: RateLimitName,
  identifier: string
): Promise<RateLimitResult> {
  const limiters = getLimiters();

  if (!limiters) {
    return allow();
  }

  try {
    const { success, remaining, reset } = await limiters[name].limit(identifier);

    return {
      success,
      remaining,
      reset,
      retryAfterSeconds: Math.max(1, Math.ceil((reset - Date.now()) / 1000)),
    };
  } catch (error) {
    // Failing open is the documented behaviour, so this is logged rather than
    // surfaced: the request is about to succeed as if unlimited
    console.error(`Rate limit check failed for "${name}":`, error);

    return allow();
  }
}

/**
 * The client-controlled `x-forwarded-for` is trustworthy here only because
 * Vercel sets it at the edge; the left-most entry is the real client. A
 * deployment reachable directly at its origin would let a caller spoof this and
 * would need a different source.
 *
 * Falls back to a single shared bucket, which is what happens in local
 * development where no proxy sets the header.
 */
function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");

  if (forwarded) {
    const client = forwarded.split(",")[0]?.trim();

    if (client) {
      return client;
    }
  }

  return headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Keys a limit by caller, optionally narrowed to one account. The email is
 * already normalized by `emailSchema` before it reaches here, so the same
 * address cannot occupy two buckets by changing case.
 */
export function rateLimitKey(headers: Headers, email?: string): string {
  const ip = getClientIp(headers);

  return email ? `${ip}:${email}` : ip;
}

function rateLimitMessage(result: RateLimitResult): string {
  if (result.retryAfterSeconds <= 60) {
    return "Too many attempts. Please try again in a minute.";
  }

  const minutes = Math.ceil(result.retryAfterSeconds / 60);

  return `Too many attempts. Please try again in ${minutes} minutes.`;
}

/**
 * The 429 every rate-limited route answers with. Deliberately says nothing
 * about the account, only about the caller's own request rate.
 */
export function rateLimitResponse(result: RateLimitResult) {
  return NextResponse.json(
    { success: false, error: rateLimitMessage(result) },
    {
      status: 429,
      headers: { "Retry-After": String(result.retryAfterSeconds) },
    }
  );
}
