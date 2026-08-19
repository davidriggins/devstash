"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthError } from "@/components/auth/AuthError";
import { AuthField } from "@/components/auth/AuthField";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { PASSWORD_MIN_LENGTH, registerSchema } from "@/lib/validation/auth";

/**
 * Posts to `/api/auth/register` rather than a Server Action, because that
 * route is also what a future mobile or CLI client would call. The same Zod
 * schema runs here first so mistakes are caught without a round trip; the
 * route re-validates, since nothing sent from a browser is trustworthy.
 */
export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);

    const formData = new FormData(event.currentTarget);
    const parsed = registerSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your details");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result?.error ?? "Could not create account");
        setIsSubmitting(false);
        return;
      }

      // Verification can be switched off server-side, in which case the account
      // is already usable. Only an explicit `false` takes this path, so an
      // older or unexpected response still asks them to check their email.
      if (result?.data?.verificationRequired === false) {
        toast.add({
          title: "Account created",
          description: "You can sign in now.",
          type: "success",
          timeout: 8000,
        });

        router.push("/sign-in");
        return;
      }

      // The route reports whether the verification email actually went out, so
      // a send failure lands on a page that says so instead of one telling
      // them to check an inbox nothing was sent to
      const emailSent = result?.data?.emailSent !== false;

      // Registration does not sign them in, so say what to do next. The
      // Toaster lives in the root layout, so this outlives the redirect.
      toast.add({
        title: "Account created",
        description: emailSent
          ? "Check your email for the link to verify your address."
          : "We could not send your verification email. Ask for a new link.",
        type: emailSent ? "success" : "error",
        // Longer than the 5s default: it lands mid-navigation, when the
        // reader's attention is on the page changing under them
        timeout: 8000,
      });

      router.push(emailSent ? "/verify-email" : "/verify-email?status=send-failed");
    } catch {
      setError("Could not reach the server. Try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <AuthField
        id="name"
        label="Name"
        autoComplete="name"
        placeholder="Ada Lovelace"
        required
      />

      <AuthField
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        required
      />

      <AuthField
        id="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        placeholder="••••••••"
        minLength={PASSWORD_MIN_LENGTH}
        required
      />

      <AuthField
        id="confirmPassword"
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        placeholder="••••••••"
        required
      />

      <AuthError message={error} />

      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting}
        className="h-10 w-full rounded-xl"
      >
        Create account
      </Button>
    </form>
  );
}
