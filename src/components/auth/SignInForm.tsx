"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signInWithCredentials, signInWithGitHub } from "@/actions/auth";
import type { SignInState } from "@/actions/auth";
import { AuthError } from "@/components/auth/AuthError";
import { AuthField } from "@/components/auth/AuthField";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { GitHubIcon } from "@/components/shared/GitHubIcon";
import { Separator } from "@/components/ui/separator";
import { EMAIL_NOT_VERIFIED_MESSAGE } from "@/lib/auth/messages";

interface SignInFormProps {
  /** Where to land after signing in; re-sent with each provider */
  callbackUrl: string;
  /** Error carried in from NextAuth's own redirect, before any submit */
  initialError?: string;
}

const EMPTY_STATE: SignInState = {};

export function SignInForm({ callbackUrl, initialError }: SignInFormProps) {
  const [state, formAction] = useActionState(
    signInWithCredentials,
    EMPTY_STATE
  );

  const error = state.error ?? initialError;

  // Both sources of this message use the one constant, so matching on it is
  // enough to know a new link is what the reader needs
  const needsVerification = error === EMAIL_NOT_VERIFIED_MESSAGE;

  return (
    <>
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />

        <AuthField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
        />

        <div className="flex flex-col gap-1.5">
          <AuthField
            id="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
          />

          <Link
            href="/forgot-password"
            className="self-end text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Forgot your password?
          </Link>
        </div>

        <AuthError message={error} />

        {needsVerification ? (
          <Link
            href="/verify-email"
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Send a new verification link
          </Link>
        ) : null}

        <SubmitButton size="lg" className="h-10 w-full rounded-xl">
          Sign in
        </SubmitButton>
      </form>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">or</span>
        <Separator className="flex-1" />
      </div>

      {/* A separate form: forms cannot nest, and this posts to another action */}
      <form action={signInWithGitHub}>
        <input type="hidden" name="callbackUrl" value={callbackUrl} />

        <SubmitButton
          variant="outline"
          size="lg"
          className="h-10 w-full rounded-xl"
        >
          <GitHubIcon className="size-4" />
          Sign in with GitHub
        </SubmitButton>
      </form>
    </>
  );
}
