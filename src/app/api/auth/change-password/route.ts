import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/db/user";
import { changePasswordSchema } from "@/lib/validation/auth";

/**
 * Changes the signed-in user's password. A route rather than a Server Action
 * because it is also the endpoint a future mobile or CLI client would call.
 *
 * Unlike the sign-in and forgot-password endpoints, this one may be specific
 * about what went wrong. Those are vague to avoid confirming which addresses
 * have accounts; here the caller has already proved they are this account, so
 * "your current password is wrong" tells them nothing they did not know.
 *
 * Sits alongside NextAuth's `[...nextauth]` catch-all: the static
 * `change-password` segment wins, so this never reaches NextAuth's handlers.
 */
export async function POST(request: Request) {
  // The session is read here rather than trusted from the body — the id in a
  // request is whatever the sender typed
  const userId = await getCurrentUserId();

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "You are not signed in" },
      { status: 401 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = changePasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Check your new password",
      },
      { status: 400 }
    );
  }

  const { currentPassword, newPassword } = parsed.data;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    // The session outlived its account — deleting a user leaves the JWT working
    if (!user) {
      return NextResponse.json(
        { success: false, error: "You are not signed in" },
        { status: 401 }
      );
    }

    // A GitHub-only account has no password to replace. Setting one here would
    // quietly add a second way in, which is a bigger decision than this form.
    if (!user.password) {
      return NextResponse.json(
        {
          success: false,
          error: "This account signs in with GitHub, so it has no password",
        },
        { status: 400 }
      );
    }

    if (!(await bcrypt.compare(currentPassword, user.password))) {
      return NextResponse.json(
        { success: false, error: "Your current password is incorrect" },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: userId },
      data: { password: await hashPassword(newPassword) },
    });

    return NextResponse.json({
      success: true,
      message: "Your password has been changed.",
    });
  } catch (error) {
    console.error("Changing password failed:", error);

    return NextResponse.json(
      { success: false, error: "Could not change your password. Try again." },
      { status: 500 }
    );
  }
}
