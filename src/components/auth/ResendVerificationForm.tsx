"use client";

import { useState } from "react";

import { AuthError } from "@/components/auth/AuthError";
import { AuthField } from "@/components/auth/AuthField";
import { Button } from "@/components/ui/button";
import { emailSchema } from "@/lib/validation/auth";

/**
 * Asks for a new verification link. The endpoint answers the same way whether
 * or not the address has an account, so this shows its message verbatim rather
 * than branching on the result.
 */
export function ResendVerificationForm() {
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setMessage(undefined);

    const parsed = emailSchema.safeParse(
      new FormData(event.currentTarget).get("email")
    );

    if (!parsed.success) {
      setError("Enter a valid email address");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: parsed.data }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result?.error ?? "Could not send a new link");
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
        Send a new link
      </Button>
    </form>
  );
}
