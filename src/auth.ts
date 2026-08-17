import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import authConfig, {
  CREDENTIALS_PROVIDER_ID,
  credentialFields,
} from "@/auth.config";
import { prisma } from "@/lib/prisma";
import { signInSchema } from "@/lib/validation/auth";

/**
 * The real Credentials provider. It replaces the edge placeholder from
 * `auth.config.ts`, which cannot run bcrypt or reach the database.
 */
const credentialsProvider = Credentials({
  id: CREDENTIALS_PROVIDER_ID,
  credentials: credentialFields,
  authorize: async (credentials) => {
    const parsed = signInSchema.safeParse(credentials);

    if (!parsed.success) {
      return null;
    }

    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });

    // GitHub-only accounts have no password, so they can't sign in this way
    if (!user?.password) {
      return null;
    }

    if (!(await bcrypt.compare(password, user.password))) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
    };
  },
});

const providers = authConfig.providers.map((provider) =>
  typeof provider !== "function" && provider.id === CREDENTIALS_PROVIDER_ID
    ? credentialsProvider
    : provider
);

/**
 * Node-runtime half of the auth config: the edge-safe providers plus the
 * Prisma adapter. The adapter still writes `users` and `accounts`, but the JWT
 * strategy keeps sessions in the cookie so the edge proxy never hits the DB.
 */
export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  providers,
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
