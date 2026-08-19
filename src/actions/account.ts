"use server";

import { signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/db/user";

export interface DeleteAccountState {
  error?: string;
}

/**
 * Deletes the signed-in account and everything it owns, then signs the browser
 * out. A Server Action rather than a route because signing out is the other
 * half of the job: sessions are JWTs, so the cookie keeps working against a
 * deleted account until it is cleared.
 *
 * The typed confirmation is checked here too. It reaches the server from a form
 * field, so the client having checked it means nothing.
 */
export async function deleteAccount(
  _prevState: DeleteAccountState,
  formData: FormData
): Promise<DeleteAccountState> {
  const user = await getCurrentUser();

  if (!user) {
    return { error: "You are not signed in" };
  }

  const confirmation = formData.get("confirmation");

  if (
    typeof confirmation !== "string" ||
    confirmation.trim().toLowerCase() !== user.email.toLowerCase()
  ) {
    return { error: "Type your email address exactly to confirm" };
  }

  try {
    await prisma.$transaction([
      // Items go first, and this is not merely tidiness: `Item.itemType` is
      // `onDelete: Restrict`, while a user's own item types cascade away with
      // the user. Deleting the user directly would race the cascade against
      // that restriction for anyone owning a custom type with items in it.
      prisma.item.deleteMany({ where: { userId: user.id } }),
      // Only the user's own types. System types have `userId = null`; they are
      // shared, and the app is unusable without them.
      prisma.itemType.deleteMany({ where: { userId: user.id } }),
      // Collections, accounts and sessions cascade from here. Shared `Tag` rows
      // are left alone: they belong to no one.
      prisma.user.delete({ where: { id: user.id } }),
    ]);
  } catch (error) {
    console.error("Deleting account failed:", error);

    return { error: "Could not delete your account. Try again." };
  }

  // Outside the try: signOut throws NEXT_REDIRECT to navigate, and catching
  // that would strand the browser on a page belonging to a deleted account
  await signOut({ redirectTo: "/" });

  return {};
}
