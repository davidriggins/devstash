import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { auth } from "@/auth";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { buttonVariants } from "@/components/ui/button";

/**
 * Placeholder so the sidebar's Profile link has somewhere to land. The real
 * profile screen is its own feature; this only echoes the session.
 */

// Renders the signed-in user, so it must never be prerendered or cached
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Profile · DevStash",
};

export default async function ProfilePage() {
  const user = (await auth())?.user;

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 p-6">
      <div className="flex items-center gap-4">
        <UserAvatar
          size="lg"
          name={user?.name}
          email={user?.email}
          image={user?.image}
        />
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold">
            {user?.name ?? "Your profile"}
          </h1>
          <p className="truncate text-sm text-muted-foreground">
            {user?.email}
          </p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Profile settings are coming in a later feature.
      </p>

      {/* Styled as a button, but a real link — Base UI's Button wants a
          native <button> underneath */}
      <Link
        href="/dashboard"
        className={buttonVariants({
          variant: "outline",
          size: "lg",
          className: "w-fit rounded-xl",
        })}
      >
        <ArrowLeft />
        Back to dashboard
      </Link>
    </div>
  );
}
