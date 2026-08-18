import { Resend } from "resend";

/**
 * Lazily built so that importing anything in this folder does not require the
 * key. The register route is the only caller that needs it, and it should fail
 * with a clear message rather than at module load in an unrelated request.
 */
let client: Resend | null = null;

export function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }

  client ??= new Resend(apiKey);

  return client;
}

/**
 * Sender address. Until a domain is verified in Resend this is the sandbox
 * `onboarding@resend.dev`, which only delivers to the Resend account owner.
 */
export function getFromAddress() {
  const from = process.env.EMAIL_FROM;

  if (!from) {
    throw new Error("EMAIL_FROM is not set");
  }

  return from;
}

/**
 * Absolute origin for links in outgoing mail. Nothing in an email is relative,
 * and the sending request's own host is not trustworthy enough to build a link
 * a user will click, so this comes from config.
 */
export function getAppUrl() {
  const url = process.env.AUTH_URL;

  if (!url) {
    throw new Error("AUTH_URL is not set");
  }

  return url.replace(/\/+$/, "");
}
