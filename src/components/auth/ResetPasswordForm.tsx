"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthError } from "@/components/auth/AuthError";
import { AuthField } from "@/components/auth/AuthField";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { PASSWORD_MIN_LENGTH, resetPasswordSchema } from "@/lib/validation/auth";

/**
 * Sets the new password. Posts to `/api/auth/reset-password` rather than a
 * Server Action, for the same reason registration does: that route is also what
 * a future mobile or CLI client would call. The shared schema runs here first so
 * a mismatch never leaves the browser; the route re-validates regardless.
 */

interface ResetPasswordFormProps {
  /** Carried from the page's query string; the page has already checked it */
  token: string;
  /** The account the token belongs to, for the password manager to file this under */
  email: string;
}

export function ResetPasswordForm({ token, email }: ResetPasswordFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [linkFailed, setLinkFailed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setLinkFailed(false);

    const formData = new FormData(event.currentTarget);
    const parsed = resetPasswordSchema.safeParse({
      token,
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your new password");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result?.error ?? "Could not reset your password");
        // The page checked the token when it loaded, so a token rejected now
        // expired or was spent while this form sat open — offer the way out
        setLinkFailed(Boolean(result?.outcome));
        setIsSubmitting(false);
        return;
      }

      // The reset does not sign them in, so say what happens next. Worded for
      // both readers: a signed-out one is sent to /sign-in, while one who
      // already had a session keeps it and is bounced on to the dashboard.
      // The Toaster lives in the root layout, so this outlives either redirect.
      toast.add({
        title: "Password changed",
        description: "Use your new password next time you sign in.",
        type: "success",
        // Longer than the 5s default: it lands mid-navigation, when the
        // reader's attention is on the page changing under them
        timeout: 8000,
      });

      router.push("/sign-in");
    } catch {
      setError("Could not reach the server. Try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/*
        A password manager needs a username field to know which account it is
        saving this password against; without one Chrome warns and the save is
        filed against nothing. Hidden rather than shown, because the page
        already names the account in its description — this field is here for
        the browser, not the reader.
      */}
      <input
        type="text"
        name="username"
        autoComplete="username"
        value={email}
        readOnly
        hidden
      />

      <AuthField
        id="password"
        label="New password"
        type="password"
        autoComplete="new-password"
        placeholder="••••••••"
        minLength={PASSWORD_MIN_LENGTH}
        required
      />

      <AuthField
        id="confirmPassword"
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        placeholder="••••••••"
        required
      />

      <AuthError message={error} />

      {linkFailed ? (
        <Link
          href="/forgot-password"
          className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Request a new reset link
        </Link>
      ) : null}

      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting}
        className="h-10 w-full rounded-xl"
      >
        Change password
      </Button>
    </form>
  );
}
