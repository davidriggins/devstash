import { NextResponse } from "next/server";

import {
  createPasswordResetToken,
  hasRecentPasswordResetToken,
} from "@/lib/auth/password-reset-token";
import { sendPasswordResetEmail } from "@/lib/email/password-reset-email";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validation/auth";

/**
 * Issues a password reset link, replacing any outstanding one.
 *
 * Every path answers the same way. An unknown address, a GitHub-only account
 * with no password to reset, and an address we mailed seconds ago are
 * indistinguishable from outside, because a different answer per case would
 * turn this into a way to ask which emails have accounts.
 *
 * Sits alongside NextAuth's `[...nextauth]` catch-all: the static
 * `forgot-password` segment wins, so this never reaches NextAuth's handlers.
 */

const GENERIC_RESPONSE = {
  success: true,
  message: "If that email has an account, a reset link is on its way.",
};

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = forgotPasswordSchema.safeParse(body);

  // A malformed address is the one thing worth saying out loud: it tells the
  // sender nothing about who has an account
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Enter a valid email address" },
      { status: 400 }
    );
  }

  const { email } = parsed.data;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { name: true, password: true },
    });

    // Nothing to reset for an unknown address, or for a GitHub-only account:
    // it has no password, and issuing one here would quietly add a second way
    // into an account whose owner only ever set up OAuth
    const canReset = user !== null && user.password !== null;

    // Without this, anyone could use the endpoint to bury a real inbox
    if (canReset && !(await hasRecentPasswordResetToken(email))) {
      await sendPasswordResetEmail({
        to: email,
        name: user.name ?? email,
        token: await createPasswordResetToken(email),
      });
    }
  } catch (error) {
    // Deliberately not a 500, unlike the resend-verification route. A send is
    // only ever attempted for an address that has an account, so an error
    // status here would answer the question the generic response exists to
    // refuse. It is logged instead, and the user can try again.
    console.error("Password reset request failed:", error);
  }

  return NextResponse.json(GENERIC_RESPONSE);
}
