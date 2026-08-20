import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";

import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe half of the auth config. The proxy runs on the edge runtime, where
 * Prisma cannot follow, so anything that touches the database — the adapter
 * above all — belongs in `auth.ts` instead.
 *
 * Credentials is declared here so the edge build knows the provider exists and
 * can render its sign-in form, but `authorize` is a placeholder: the real check
 * needs Prisma and bcrypt, so `auth.ts` swaps this provider for the Node one.
 */
export const CREDENTIALS_PROVIDER_ID = "credentials";

/** Where signed-out visitors land, and where NextAuth sends its own redirects */
export const SIGN_IN_PATH = "/sign-in";

/** Where a successful sign-in lands when nothing else was requested */
export const DEFAULT_SIGN_IN_REDIRECT = "/dashboard";

/** Where the verification link's outcome is reported, and where a new account lands */
export const VERIFY_EMAIL_PATH = "/verify-email";

/**
 * Where the reset link points. A page, not a route: clicking it only reads the
 * token to decide whether to show the form, and the change happens on submit.
 * Lives here so the email that builds the link and the page that answers it
 * cannot disagree.
 */
export const RESET_PASSWORD_PATH = "/reset-password";

/**
 * `CredentialsSignin.code` for an unverified account. It travels in the URL on
 * NextAuth's own redirects, so it names a state rather than describing one.
 */
export const EMAIL_NOT_VERIFIED_CODE = "EmailNotVerified";

/**
 * `CredentialsSignin.code` for a caller who has attempted too many sign-ins.
 * Like the code above it travels in the URL, so it names the state rather than
 * carrying the retry window — a direct POST to the credentials callback is
 * redirected here too, and an identifier is not the place to put data.
 */
export const RATE_LIMITED_CODE = "RateLimited";

export const credentialFields = {
  email: { label: "Email", type: "email" },
  password: { label: "Password", type: "password" },
};

export default {
  pages: {
    // Our own pages replace NextAuth's built-in ones. `signIn` also receives
    // NextAuth's own redirects (an unauthenticated `signIn()` call, an OAuth
    // failure), so the error query param lands here too.
    signIn: SIGN_IN_PATH,
    error: SIGN_IN_PATH,
  },
  providers: [
    GitHub,
    Credentials({
      id: CREDENTIALS_PROVIDER_ID,
      credentials: credentialFields,
      authorize: () => null,
    }),
  ],
} satisfies NextAuthConfig;
