"use client";

import { useState } from "react";

import { AuthError } from "@/components/auth/AuthError";
import { AuthField } from "@/components/auth/AuthField";
import { Button } from "@/components/ui/button";
import { forgotPasswordSchema } from "@/lib/validation/auth";

/**
 * Asks for a password reset link. The endpoint answers the same way whether or
 * not the address has an account, so this shows its message verbatim rather
 * than branching on the result — branching here would leak what the endpoint
 * is careful not to say.
 */
export function ForgotPasswordForm() {
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setMessage(undefined);

    const parsed = forgotPasswordSchema.safeParse({
      email: new FormData(event.currentTarget).get("email"),
    });

    if (!parsed.success) {
      setError("Enter a valid email address");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result?.error ?? "Could not send a reset link");
      } else {
        setMessage(result?.message ?? "Check your inbox.");
      }
    } catch {
      setError("Could not reach the server. Try again.");
    }

    setIsSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <AuthField
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        required
      />

      <AuthError message={error} />

      {message ? (
        <p role="status" className="text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting}
        className="h-10 w-full rounded-xl"
      >
        Send reset link
      </Button>
    </form>
  );
}
