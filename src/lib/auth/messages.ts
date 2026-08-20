/**
 * Auth copy shown in more than one place. The sign-in action returns this
 * after a form submit, and the sign-in page shows the same words when NextAuth
 * redirects with the error code instead, so they are written once.
 */
export const EMAIL_NOT_VERIFIED_MESSAGE =
  "Verify your email before signing in. Check your inbox for the link, or request a new one.";

/**
 * Deliberately without a duration, unlike the 429 the API routes return. The
 * sign-in refusal is thrown from `authorize` and reaches the reader through
 * NextAuth's error code, which carries no room for a number — and the only
 * number available would be Upstash's window reset, which can expire before the
 * sliding window actually frees up.
 */
export const RATE_LIMITED_MESSAGE =
  "Too many sign-in attempts. Please try again later.";
