import Link from "next/link";
import { TriangleAlert } from "lucide-react";

import { AuthCard } from "@/components/auth/AuthCard";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { buttonVariants } from "@/components/ui/button";
import { checkPasswordResetToken } from "@/lib/auth/password-reset-token";
import { firstParam } from "@/lib/search-params";
import { cn } from "@/lib/utils";

// Reads the database on every request, so it must never be prerendered or cached
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Choose a new password · DevStash",
};

/**
 * The target of the link in the reset email. A page rather than an API route —
 * the opposite of the verification link — because arriving here only *reads*
 * the token to decide what to show. The password change happens on submit, so
 * nothing is mutated while this renders and a refresh is harmless.
 *
 * The token reaches the form through a prop and leaves through a request body,
 * so it is in the address bar only for as long as this page is open.
 *
 * Unlike the other pages in this group, a signed-in visitor is *not* redirected
 * away. Holding a session says nothing about whether this link should work: a
 * reader signed in on one device may be resetting a password they forgot on
 * another, or acting on a reset someone else requested for their account.
 * Bouncing them to the dashboard swallowed the link and explained nothing.
 */
export default async function ResetPasswordPage({
  searchParams,
}: PageProps<"/reset-password">) {
  const token = firstParam((await searchParams).token);
  const check = token
    ? await checkPasswordResetToken(token)
    : ({ status: "invalid" } as const);

  // Naming the reason is safe here in a way it is not on the request form:
  // reaching this page at all means holding a token, so it reveals nothing
  // about who has an account
  if (check.status !== "valid" || !token) {
    const expired = check.status === "expired";

    return (
      <AuthCard
        title={expired ? "That link has expired" : "That link did not work"}
        description={
          expired
            ? "Reset links last 1 hour. Ask for a fresh one and try again."
            : "It may have already been used. Ask for a new link, or sign in if you have already changed your password."
        }
        footer={
          <>
            Remembered it?{" "}
            <Link href="/sign-in" className="text-foreground hover:underline">
              Sign in
            </Link>
          </>
        }
      >
        <TriangleAlert className="size-8 text-destructive" aria-hidden />

        {/* A Link, not a Button: Base UI's Button wants a native <button> */}
        <Link
          href="/forgot-password"
          className={cn(
            buttonVariants({ size: "lg" }),
            "h-10 w-full rounded-xl"
          )}
        >
          Request a new link
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Choose a new password"
      description={`Setting a new password for ${check.email}.`}
      footer={
        <>
          Remembered it?{" "}
          <Link href="/sign-in" className="text-foreground hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <ResetPasswordForm token={token} email={check.email} />
    </AuthCard>
  );
}
