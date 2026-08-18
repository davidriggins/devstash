import { NextResponse } from "next/server";

import { VERIFY_EMAIL_PATH } from "@/auth.config";
import { consumeVerificationToken } from "@/lib/auth/verification-token";

/**
 * The target of the link in the verification email. A route rather than a page
 * because clicking it changes data, and a page component must not mutate while
 * it renders. It claims the token, then hands off to `/verify-email` to say
 * what happened.
 *
 * Sits alongside NextAuth's `[...nextauth]` catch-all: the static `verify-email`
 * segment wins, so this never reaches NextAuth's own handlers.
 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const outcome = token ? await consumeVerificationToken(token) : "invalid";

  // Redirect rather than render, so the token stops travelling with the user:
  // it would otherwise sit in the address bar, in history, and in the referrer
  // of anything the result page links to.
  const destination = new URL(VERIFY_EMAIL_PATH, request.url);
  destination.searchParams.set("status", outcome);

  return NextResponse.redirect(destination);
}
