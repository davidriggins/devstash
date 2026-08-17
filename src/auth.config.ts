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

export const credentialFields = {
  email: { label: "Email", type: "email" },
  password: { label: "Password", type: "password" },
};

export default {
  providers: [
    GitHub,
    Credentials({
      id: CREDENTIALS_PROVIDER_ID,
      credentials: credentialFields,
      authorize: () => null,
    }),
  ],
} satisfies NextAuthConfig;
