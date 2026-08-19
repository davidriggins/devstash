import { NextResponse } from "next/server";

import { hashPassword } from "@/lib/auth/password";
import { consumePasswordResetToken } from "@/lib/auth/password-reset-token";
import { resetPasswordSchema } from "@/lib/validation/auth";

/**
 * Claims a reset token and writes the new password. The token arrives in the
 * body from the hidden field on `/reset-password`, so it never travels in this
 * request's URL, history or referrer.
 *
 * Sits alongside NextAuth's `[...nextauth]` catch-all: the static
 * `reset-password` segment wins, so this never reaches NextAuth's handlers.
 */

/**
 * One message for both. `expired` and `invalid` differ only in what happened to
 * a token the sender already holds, and the fix is the same either way.
 */
const LINK_UNUSABLE =
  "This reset link is invalid or has expired. Request a new one.";

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

  const parsed = resetPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Check your new password",
      },
      { status: 400 }
    );
  }

  const { token, password } = parsed.data;

  try {
    // The hash is computed before the claim so the transaction holds its rows
    // for as little time as possible; bcrypt at cost 12 is the slow part here
    const outcome = await consumePasswordResetToken(
      token,
      await hashPassword(password)
    );

    if (outcome !== "reset") {
      // `outcome` is echoed for the client's own logging; the copy is the same
      return NextResponse.json(
        { success: false, error: LINK_UNUSABLE, outcome },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Your password has been changed.",
    });
  } catch (error) {
    console.error("Password reset failed:", error);

    return NextResponse.json(
      { success: false, error: "Could not reset your password. Try again." },
      { status: 500 }
    );
  }
}
