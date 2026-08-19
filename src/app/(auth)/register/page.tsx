import Link from "next/link";
import { redirect } from "next/navigation";

import { DEFAULT_SIGN_IN_REDIRECT } from "@/auth.config";
import { AuthCard } from "@/components/auth/AuthCard";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { getCurrentUser } from "@/lib/db/user";

// Branches on the session, so it must never be prerendered or cached
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Create account · DevStash",
};

export default async function RegisterPage() {
  // Already signed in, so there is nothing to register. Checked against the
  // database for the same reason as the sign-in page: a JWT outlives its user.
  if (await getCurrentUser()) {
    redirect(DEFAULT_SIGN_IN_REDIRECT);
  }

  return (
    <AuthCard
      title="Create your account"
      description="One place for your snippets, prompts and commands."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/sign-in" className="text-foreground hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthCard>
  );
}
