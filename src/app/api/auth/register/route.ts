import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { Prisma } from "@/generated/prisma/client";
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

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: await bcrypt.hash(password, PASSWORD_SALT_ROUNDS),
      },
      select: { id: true, name: true, email: true },
    });

    return NextResponse.json({ success: true, data: user }, { status: 201 });
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
