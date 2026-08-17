import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { DEFAULT_SIGN_IN_REDIRECT } from "@/auth.config";
import { AuthCard } from "@/components/auth/AuthCard";
import { SignInForm } from "@/components/auth/SignInForm";
import { firstParam, safePath } from "@/lib/search-params";

// Branches on the session, so it must never be prerendered or cached
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sign in · DevStash",
};

/**
 * NextAuth's own redirects land here with an `error` code rather than a
 * message. Anything unmapped gets the generic line — the codes are internal
 * names, not something to show a user.
 */
const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "Invalid email or password",
  OAuthAccountNotLinked:
    "That email already has an account. Sign in the way you did the first time.",
  AccessDenied: "You do not have access to this application",
};

export default async function SignInPage({
  searchParams,
}: PageProps<"/sign-in">) {
  // Nothing to sign into if they already are
  if (await auth()) {
    redirect(DEFAULT_SIGN_IN_REDIRECT);
  }

  const params = await searchParams;
  const errorCode = firstParam(params.error);

  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to get to your stash."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-foreground hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <SignInForm
        callbackUrl={safePath(
          firstParam(params.callbackUrl),
          DEFAULT_SIGN_IN_REDIRECT
        )}
        initialError={
          errorCode
            ? (ERROR_MESSAGES[errorCode] ?? "Could not sign you in")
            : undefined
        }
      />
    </AuthCard>
  );
}
