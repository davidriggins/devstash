import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";

import authConfig, {
  CREDENTIALS_PROVIDER_ID,
  EMAIL_NOT_VERIFIED_CODE,
  RATE_LIMITED_CODE,
  credentialFields,
} from "@/auth.config";
import { isEmailVerificationEnabled } from "@/lib/auth/email-verification";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { signInSchema } from "@/lib/validation/auth";

/**
 * The one failure `authorize` reports specifically. Every other rejection
 * returns `null` and reads as "invalid email or password", because saying more
 * would tell a stranger which addresses have accounts.
 *
 * This one is safe to name: it is only ever thrown *after* the password
 * matched, so whoever sees it already knew the account existed.
 */
class EmailNotVerifiedError extends CredentialsSignin {
  code = EMAIL_NOT_VERIFIED_CODE;
}

/**
 * Thrown when the caller has spent their sign-in allowance. Safe to name for
 * the same reason a 429 is: it describes how often *this caller* has asked,
 * and says nothing about whether the address has an account.
 */
class RateLimitedError extends CredentialsSignin {
  code = RATE_LIMITED_CODE;
}

/**
 * The real Credentials provider. It replaces the edge placeholder from
 * `auth.config.ts`, which cannot run bcrypt or reach the database.
 */
const credentialsProvider = Credentials({
  id: CREDENTIALS_PROVIDER_ID,
  credentials: credentialFields,
  authorize: async (credentials, request) => {
    const parsed = signInSchema.safeParse(credentials);

    if (!parsed.success) {
      return null;
    }

    const { email, password } = parsed.data;

    // Here rather than in the sign-in Server Action, because *every* caller of
    // the credentials callback reaches this — including a direct POST to
    // `/api/auth/callback/credentials` that never touches the form. Limiting
    // the action alone left password guessing wide open to a five-line script.
    //
    // After the parse and before the lookup, so the count moves for every
    // well-formed attempt and a refusal never reveals whether the account is
    // real.
    const limit = await checkRateLimit(
      "signIn",
      rateLimitKey(request.headers, email)
    );

    if (!limit.success) {
      throw new RateLimitedError();
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // GitHub-only accounts have no password, so they can't sign in this way
    if (!user?.password) {
      return null;
    }

    if (!(await bcrypt.compare(password, user.password))) {
      return null;
    }

    // Deliberately after the password check, so a wrong guess still gets the
    // vague answer and cannot be used to probe for accounts. Skipped entirely
    // when verification is off, which also lets accounts left unverified by an
    // earlier run sign in.
    if (isEmailVerificationEnabled() && !user.emailVerified) {
      throw new EmailNotVerifiedError();
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
