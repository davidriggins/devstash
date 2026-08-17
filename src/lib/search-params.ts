/**
 * Helpers for the untrusted `searchParams` object. A query param can legally
 * repeat (`?error=a&error=b`), so every value arrives as `string | string[]`.
 */

export function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Keeps a redirect target on this site. A full URL in `callbackUrl` would
 * turn our own sign-in page into an open redirect, and `//evil.com` is a
 * protocol-relative URL, so a leading slash alone is not enough of a check.
 */
export function safePath(value: string | undefined, fallback: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}
