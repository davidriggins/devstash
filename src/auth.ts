import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";

import authConfig from "@/auth.config";
import { prisma } from "@/lib/prisma";

/**
 * Node-runtime half of the auth config: the edge-safe providers plus the
 * Prisma adapter. The adapter still writes `users` and `accounts`, but the JWT
 * strategy keeps sessions in the cookie so the edge proxy never hits the DB.
 */
export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  callbacks: {
    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }

      return session;
    },
  },
});
