import GitHub from "next-auth/providers/github";

import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe half of the auth config. The proxy runs on the edge runtime, where
 * Prisma cannot follow, so anything that touches the database — the adapter
 * above all — belongs in `auth.ts` instead.
 */
export default {
  providers: [GitHub],
} satisfies NextAuthConfig;
