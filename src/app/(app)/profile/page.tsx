import { redirect } from "next/navigation";
import { CalendarDays } from "lucide-react";

import { SIGN_IN_PATH } from "@/auth.config";
import { ChangePasswordForm } from "@/components/profile/ChangePasswordForm";
import { DeleteAccountDialog } from "@/components/profile/DeleteAccountDialog";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { GitHubIcon } from "@/components/shared/GitHubIcon";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/db/user";

export const metadata = {
  title: "Profile · DevStash",
};

// Reads the signed-in user, so it must never be prerendered or cached
export const dynamic = "force-dynamic";

const JOINED_FORMAT = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
});

export default async function ProfilePage() {
  const user = await getCurrentUser();

  // The proxy already keeps signed-out visitors away, but it is a redirect, not
  // an authorization boundary — and it cannot know the session names an account
  // that has since been deleted, which a JWT happily outlives.
  if (!user) {
    redirect(SIGN_IN_PATH);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-1 text-muted-foreground">
          Your account and what is in it
        </p>
      </header>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-4">
          <UserAvatar
            size="lg"
            name={user.name}
            email={user.email}
            image={user.image}
          />

          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold">
              {user.name ?? "Unnamed"}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {user.email}
            </p>
          </div>

          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="size-4" aria-hidden />
            Joined {JOINED_FORMAT.format(user.createdAt)}
          </p>
        </CardContent>
      </Card>

      <ProfileStats />

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
        </CardHeader>
        <CardContent>
          {user.hasPassword ? (
            <ChangePasswordForm email={user.email} />
          ) : (
            // A GitHub-only account has no password to change, so it is told
            // that rather than shown a form that could not work
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <GitHubIcon className="size-4" />
              You sign in with GitHub, so there is no password to change.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Danger zone</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Deleting your account removes every item and collection you own.
            This cannot be undone.
          </p>

          <DeleteAccountDialog email={user.email} />
        </CardContent>
      </Card>
    </div>
  );
}
