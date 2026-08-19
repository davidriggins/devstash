"use client";

import { useRef, useState } from "react";

import { AuthError } from "@/components/auth/AuthError";
import { AuthField } from "@/components/auth/AuthField";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { PASSWORD_MIN_LENGTH, changePasswordSchema } from "@/lib/validation/auth";

/**
 * Changes the password from inside the account. Posts to
 * `/api/auth/change-password` rather than a Server Action, matching register
 * and reset: that route is also what a future mobile or CLI client would call.
 * The shared schema runs here first so a mismatch never leaves the browser.
 */

interface ChangePasswordFormProps {
  /** Names the account for the password manager, via a hidden username field */
  email: string;
}

export function ChangePasswordForm({ email }: ChangePasswordFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);

    const formData = new FormData(event.currentTarget);
    const parsed = changePasswordSchema.safeParse({
      currentPassword: formData.get("currentPassword"),
      newPassword: formData.get("newPassword"),
      confirmPassword: formData.get("confirmPassword"),
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your new password");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result?.error ?? "Could not change your password");
        setIsSubmitting(false);
        return;
      }

      // Nothing navigates here, so the fields are cleared by hand — leaving the
      // old password sitting in the form after a success would be careless
      formRef.current?.reset();
      setIsSubmitting(false);

      toast.add({
        title: "Password changed",
        description: "Use your new password next time you sign in.",
        type: "success",
      });
    } catch {
      setError("Could not reach the server. Try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="flex max-w-sm flex-col gap-4"
    >
      {/* For the password manager, not the reader: without a username field it
          has no account to file the new password under */}
      <input
        type="text"
        name="username"
        autoComplete="username"
        value={email}
        readOnly
        hidden
      />

      <AuthField
        id="currentPassword"
        label="Current password"
        type="password"
        autoComplete="current-password"
        placeholder="••••••••"
        required
      />

      <AuthField
        id="newPassword"
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

      <Button
        type="submit"
        disabled={isSubmitting}
        className="h-10 w-fit rounded-xl"
      >
        Change password
      </Button>
    </form>
  );
}
