import { NextResponse } from "next/server";
import { z } from "zod";

import { isEmailVerificationEnabled } from "@/lib/auth/email-verification";
import {
  createVerificationToken,
  hasRecentVerificationToken,
} from "@/lib/auth/verification-token";
import { sendVerificationEmail } from "@/lib/email/verification-email";
import { prisma } from "@/lib/prisma";
import { emailSchema } from "@/lib/validation/auth";

/**
 * Issues a fresh verification link, replacing any outstanding one.
 *
 * Every path answers the same way. An unknown address, an address that is
 * already verified and an address we just mailed are indistinguishable from
 * outside, because a different answer per case would turn this into a way to
 * ask which emails have accounts.
 */

const resendSchema = z.object({ email: emailSchema });

const GENERIC_RESPONSE = {
  success: true,
  message: "If that account needs verifying, a new link is on its way.",
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

  const parsed = resendSchema.safeParse(body);

  // A malformed address is the one thing worth saying out loud: it tells the
  // sender nothing about who has an account
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Enter a valid email address" },
      { status: 400 }
    );
  }

  const { email } = parsed.data;

  // Nothing to verify when the flow is off. It answers as it always does — the
  // generic response was already designed to reveal nothing.
  if (!isEmailVerificationEnabled()) {
    return NextResponse.json(GENERIC_RESPONSE);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { name: true, emailVerified: true, password: true },
    });

    // Nothing to do for an unknown address, one already verified, or a
    // GitHub-only account, which has no credentials sign-in to unblock
    const needsVerification = user && !user.emailVerified && user.password;

    // Without this, anyone could use the endpoint to bury a real inbox
    if (needsVerification && !(await hasRecentVerificationToken(email))) {
      await sendVerificationEmail({
        to: email,
        name: user.name ?? email,
        token: await createVerificationToken(email),
      });
    }
  } catch (error) {
    console.error("Resending verification email failed:", error);

    return NextResponse.json(
      { success: false, error: "Could not send a new link. Try again." },
      { status: 500 }
    );
  }

  return NextResponse.json(GENERIC_RESPONSE);
}
