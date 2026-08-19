import Link from "next/link";

import { AuthCard } from "@/components/auth/AuthCard";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata = {
  title: "Reset your password · DevStash",
};

/**
 * Unlike sign-in and register, a signed-in visitor is not redirected away.
 * Being signed in does not mean remembering the password — a session outlives
 * it — and the reset page links straight here from its "request a new link"
 * button, so bouncing one and not the other would strand a reader mid-flow.
 */
export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Forgot your password?"
      description="Enter your email and we will send you a link to choose a new one."
      footer={
        <>
          Remembered it?{" "}
          <Link href="/sign-in" className="text-foreground hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
