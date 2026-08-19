import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { Prisma } from "@/generated/prisma/client";
import { isEmailVerificationEnabled } from "@/lib/auth/email-verification";
import { createVerificationToken } from "@/lib/auth/verification-token";
import { sendVerificationEmail } from "@/lib/email/verification-email";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation/auth";

/**
 * Sign-up for the Credentials provider. A route rather than a Server Action
 * because it is also the endpoint a future mobile or CLI client would call.
 *
 * Sits alongside NextAuth's `[...nextauth]` catch-all: the static `register`
 * segment wins, so this never reaches NextAuth's own handlers.
 */

// Matches prisma/seed.ts so seeded and registered passwords hash the same way
const PASSWORD_SALT_ROUNDS = 12;

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

  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid registration details",
      },
      { status: 400 }
    );
  }

  const { name, email, password } = parsed.data;

  try {
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "An account with that email already exists" },
        { status: 409 }
      );
    }

    const verificationRequired = isEmailVerificationEnabled();

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: await bcrypt.hash(password, PASSWORD_SALT_ROUNDS),
        // With verification off the account is usable straight away, so it is
        // stamped verified here rather than left null for sign-in to ignore —
        // the flag can be turned back on without stranding these accounts
        emailVerified: verificationRequired ? null : new Date(),
      },
      select: { id: true, name: true, email: true },
    });

    // When verification is on, the account stays unverified until the link is
    // clicked, and a failed send is reported rather than rolled back: the
    // account is real, and the resend endpoint is how the user recovers from
    // it. When it is off, nothing is sent and nothing is waiting on a link.
    const emailSent = verificationRequired
      ? await sendVerificationEmail({
          to: user.email,
          name: user.name ?? user.email,
          token: await createVerificationToken(user.email),
        })
      : false;

    // `verificationRequired` is how the client knows which page to send them
    // to. The flag itself stays on the server.
    return NextResponse.json(
      { success: true, data: { ...user, verificationRequired, emailSent } },
      { status: 201 }
    );
  } catch (error) {
    // Two simultaneous signups can both clear the check above; the unique
    // index on `email` is what actually decides, so report the loser as a dupe
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { success: false, error: "An account with that email already exists" },
        { status: 409 }
      );
    }

    console.error("Registration failed:", error);

    return NextResponse.json(
      { success: false, error: "Could not create account" },
      { status: 500 }
    );
  }
}
