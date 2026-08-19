import { createHash, randomBytes } from "node:crypto";

import { Prisma } from "@/generated/prisma/client";
import { PASSWORD_RESET_IDENTIFIER_PREFIX } from "@/lib/auth/password-reset-token";
import { prisma } from "@/lib/prisma";

/**
 * Single-use, expiring tokens for the email verification link. They live in
 * NextAuth's `VerificationToken` table, which the adapter creates but nothing
 * in this app writes — we use no Email provider — so no migration is needed.
 *
 * `identifier` is the email the link was sent to.
 */

/** Long enough that a link left in an inbox overnight still works */
export const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/** A fresh link inside this window reuses the existing one instead of sending again */
export const RESEND_COOLDOWN_MS = 60 * 1000;

/**
 * Only the hash is stored. The raw token is a bearer credential — anyone
 * holding it can verify the address — so a leaked database dump should not
 * hand over working links, exactly as with a password.
 */
function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Replaces any outstanding link for this address, so the newest email is the
 * only one that works. Returns the raw token; the caller must put it in the
 * email and nowhere else.
 */
export async function createVerificationToken(email: string) {
  const token = randomBytes(32).toString("base64url");

  await prisma.verificationToken.deleteMany({ where: { identifier: email } });
  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token: hashToken(token),
      expires: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
    },
  });

  return token;
}

/**
 * True when a link was issued to this address within the cooldown. There is no
 * `createdAt` on the table, so the age is read backwards off `expires`: a token
 * minted `n` ms ago expires `TTL - n` ms from now.
 *
 * Keeps the resend endpoint from being used to flood a real inbox.
 */
export async function hasRecentVerificationToken(email: string) {
  const issuedAfter = new Date(
    Date.now() + VERIFICATION_TOKEN_TTL_MS - RESEND_COOLDOWN_MS
  );

  const recent = await prisma.verificationToken.findFirst({
    where: { identifier: email, expires: { gt: issuedAfter } },
    select: { identifier: true },
  });

  return recent !== null;
}

export type VerificationOutcome =
  | "verified"
  | "already-verified"
  | "expired"
  | "invalid";

/**
 * Claims the token and marks the address verified. Every failure path returns
 * an outcome rather than throwing, because the caller renders it to a stranger.
 *
 * A token already spent — including by the same person clicking twice — reads
 * as `invalid`: once the row is gone there is nothing left to tell the two
 * cases apart, and keeping it around to distinguish them would mean links that
 * outlive their single use.
 */
export async function consumeVerificationToken(
  rawToken: string
): Promise<VerificationOutcome> {
  const token = hashToken(rawToken);
  const record = await prisma.verificationToken.findUnique({
    where: { token },
    select: { identifier: true, expires: true },
  });

  // The table is shared with the password reset flow, which namespaces its
  // identifiers. Tokens are found by hash, which is not namespaced, so without
  // this a reset token could be spent here — and its identifier would be read
  // as an email. Returning early also leaves that row alone: it is not ours.
  if (!record || record.identifier.startsWith(PASSWORD_RESET_IDENTIFIER_PREFIX)) {
    return "invalid";
  }

  if (record.expires.getTime() < Date.now()) {
    await prisma.verificationToken.deleteMany({ where: { token } });
    return "expired";
  }

  const user = await prisma.user.findUnique({
    where: { email: record.identifier },
    select: { id: true, emailVerified: true },
  });

  // The account was deleted between sending and clicking
  if (!user) {
    await prisma.verificationToken.deleteMany({ where: { token } });
    return "invalid";
  }

  if (user.emailVerified) {
    await prisma.verificationToken.deleteMany({ where: { token } });
    return "already-verified";
  }

  try {
    // The delete is what makes the token single-use, and it is inside the
    // transaction so two simultaneous clicks cannot both pass it
    await prisma.$transaction([
      prisma.verificationToken.delete({ where: { token } }),
      prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      }),
    ]);
  } catch (error) {
    // P2025: the row was gone by the time we claimed it, so someone else won
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return "invalid";
    }

    throw error;
  }

  return "verified";
}
