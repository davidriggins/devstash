import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleCheck, Mail, MailWarning, TriangleAlert } from "lucide-react";

import { SIGN_IN_PATH } from "@/auth.config";
import { AuthCard } from "@/components/auth/AuthCard";
import { ResendVerificationForm } from "@/components/auth/ResendVerificationForm";
import { buttonVariants } from "@/components/ui/button";
import { isEmailVerificationEnabled } from "@/lib/auth/email-verification";
import { firstParam } from "@/lib/search-params";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Verify your email · DevStash",
};

/**
 * Reports what happened to a verification link. Purely presentational — the
 * token is claimed by `/api/auth/verify-email`, which redirects here with a
 * `status`, so nothing is mutated by rendering this page.
 *
 * `sent` and `send-failed` come from the register form instead, which is why
 * an unrecognised or missing status falls back to `sent`: someone who just
 * signed up and lost the query string is still waiting on an email.
 */

type Status =
  | "sent"
  | "send-failed"
  | "verified"
  | "already-verified"
  | "expired"
  | "invalid";

interface StatusView {
  icon: typeof Mail;
  tone: string;
  title: string;
  description: string;
  /** Verified accounts have nothing left to ask for */
  showResend: boolean;
}

const STATUS_VIEWS: Record<Status, StatusView> = {
  sent: {
    icon: Mail,
    tone: "text-muted-foreground",
    title: "Check your email",
    description:
      "We sent you a link to confirm your address. It works once and expires in 24 hours. Nothing there? Ask for another one.",
    showResend: true,
  },
  "send-failed": {
    icon: MailWarning,
    tone: "text-destructive",
    title: "We could not send your email",
    description:
      "Your account was created, but the verification email did not go out. Ask for a new link to finish setting it up.",
    showResend: true,
  },
  verified: {
    icon: CircleCheck,
    tone: "text-emerald-500",
    title: "Email verified",
    description: "Your address is confirmed. You can sign in now.",
    showResend: false,
  },
  "already-verified": {
    icon: CircleCheck,
    tone: "text-emerald-500",
    title: "Already verified",
    description: "This address was confirmed earlier. Just sign in.",
    showResend: false,
  },
  expired: {
    icon: TriangleAlert,
    tone: "text-destructive",
    title: "That link has expired",
    description:
      "Verification links last 24 hours. Enter your email and we will send a fresh one.",
    showResend: true,
  },
  invalid: {
    icon: TriangleAlert,
    tone: "text-destructive",
    title: "That link did not work",
    description:
      "It may have already been used — if you have verified your email, just sign in. Otherwise, ask for a new link below.",
    showResend: true,
  },
};

function toStatus(value: string | undefined): Status {
  return value && value in STATUS_VIEWS ? (value as Status) : "sent";
}

export default async function VerifyEmailPage({
  searchParams,
}: PageProps<"/verify-email">) {
  // With verification off, nothing routes here and every status would be a
  // lie — the resend form included, since that endpoint no longer sends
  if (!isEmailVerificationEnabled()) {
    redirect(SIGN_IN_PATH);
  }

  const params = await searchParams;
  const view = STATUS_VIEWS[toStatus(firstParam(params.status))];
  const Icon = view.icon;

  return (
    <AuthCard
      title={view.title}
      description={view.description}
      footer={
        <>
          Need a different account?{" "}
          <Link href="/register" className="text-foreground hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <Icon className={cn("size-8", view.tone)} aria-hidden />

      {view.showResend ? (
        <ResendVerificationForm />
      ) : (
        // A Link, not a Button: Base UI's Button wants a native <button>
        <Link
          href="/sign-in"
          className={cn(
            buttonVariants({ size: "lg" }),
            "h-10 w-full rounded-xl"
          )}
        >
          Go to sign in
        </Link>
      )}
    </AuthCard>
  );
}
