import { createHash, randomBytes } from "node:crypto";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Single-use, expiring tokens for the password reset link. They share NextAuth's
 * `VerificationToken` table with the email verification flow, so no migration is
 * needed — but the two must not touch each other's rows.
 *
 * That is what the prefix is for. Email verification stores `identifier` as the
 * bare email, so if reset tokens did the same:
 *
 *  - issuing a reset would delete a pending verification link, and vice versa,
 *    since both replace "any outstanding token for this address"
 *  - one flow's cooldown would suppress the other's email
 *  - a token minted by one flow would be accepted by the other, because both
 *    look a token up by its hash alone
 *
 * So every query here is scoped to the prefix, and every row read here is
 * checked for it before its identifier is treated as an email.
 */
export const PASSWORD_RESET_IDENTIFIER_PREFIX = "password-reset:";

/**
 * Deliberately much shorter than the 24h verification link. This one grants a
 * password change, so a link forgotten in an inbox is worth more to whoever
 * finds it later.
 */
export const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

/** A second request inside this window is answered without sending again */
export const PASSWORD_RESET_COOLDOWN_MS = 60 * 1000;

/**
 * Only the hash is stored. The raw token is a bearer credential — anyone
 * holding it can take over the account — so a leaked database dump should not
 * hand over working links.
 */
function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function identifierFor(email: string) {
  return `${PASSWORD_RESET_IDENTIFIER_PREFIX}${email}`;
}

/**
 * The email a reset row belongs to, or `null` if the row is not one of ours.
 * Rows are found by token hash, which is not namespaced, so this is the check
 * that stops a verification token being spent as a reset token.
 */
function emailFromIdentifier(identifier: string) {
  return identifier.startsWith(PASSWORD_RESET_IDENTIFIER_PREFIX)
    ? identifier.slice(PASSWORD_RESET_IDENTIFIER_PREFIX.length)
    : null;
}

/**
 * Replaces any outstanding reset link for this address, so the newest email is
 * the only one that works. Returns the raw token; the caller must put it in the
 * email and nowhere else.
 */
export async function createPasswordResetToken(email: string) {
  const token = randomBytes(32).toString("base64url");

  await prisma.verificationToken.deleteMany({
    where: { identifier: identifierFor(email) },
  });
  await prisma.verificationToken.create({
    data: {
      identifier: identifierFor(email),
      token: hashToken(token),
      expires: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS),
    },
  });

  return token;
}

/**
 * True when a reset link was issued to this address within the cooldown. There
 * is no `createdAt` on the table, so the age is read backwards off `expires`: a
 * token minted `n` ms ago expires `TTL - n` ms from now.
 *
 * Keeps the endpoint from being used to flood a real inbox.
 */
export async function hasRecentPasswordResetToken(email: string) {
  const issuedAfter = new Date(
    Date.now() + PASSWORD_RESET_TOKEN_TTL_MS - PASSWORD_RESET_COOLDOWN_MS
  );

  const recent = await prisma.verificationToken.findFirst({
    where: { identifier: identifierFor(email), expires: { gt: issuedAfter } },
    select: { identifier: true },
  });

  return recent !== null;
}

export type PasswordResetOutcome = "reset" | "expired" | "invalid";

/**
 * A valid check carries the address the link was sent to. The page renders it,
 * so the reader can see which account they are about to change, and so the form
 * can name the account for a password manager. Telling the holder of a valid
 * token whose account it is reveals nothing: the link came from that inbox.
 */
export type PasswordResetCheck =
  | { status: "valid"; email: string }
  | { status: "expired" | "invalid" };

/**
 * Looks a token up without spending it, so the reset page can decide whether to
 * render the form. Read-only on purpose: arriving at the page must not consume
 * anything, or a refresh would break the link the reader is still using.
 */
export async function checkPasswordResetToken(
  rawToken: string
): Promise<PasswordResetCheck> {
  const record = await prisma.verificationToken.findUnique({
    where: { token: hashToken(rawToken) },
    select: { identifier: true, expires: true },
  });

  const email = record && emailFromIdentifier(record.identifier);

  if (!record || email === null) {
    return { status: "invalid" };
  }

  return record.expires.getTime() < Date.now()
    ? { status: "expired" }
    : { status: "valid", email };
}

/**
 * Claims the token and writes the new password. Every failure path returns an
 * outcome rather than throwing, because the caller shows it to a stranger.
 *
 * A token already spent reads as `invalid`: once the row is gone there is
 * nothing left to tell that apart from a token that never existed, and keeping
 * it around to distinguish them would mean links outliving their single use.
 */
export async function consumePasswordResetToken(
  rawToken: string,
  passwordHash: string
): Promise<PasswordResetOutcome> {
  const token = hashToken(rawToken);
  const record = await prisma.verificationToken.findUnique({
    where: { token },
    select: { identifier: true, expires: true },
  });

  // Not found, or found but belonging to the verification flow
  const email = record && emailFromIdentifier(record.identifier);

  if (!record || email === null) {
    return "invalid";
  }

  if (record.expires.getTime() < Date.now()) {
    await prisma.verificationToken.deleteMany({ where: { token } });
    return "expired";
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, emailVerified: true },
  });

  // The account was deleted between sending and clicking
  if (!user) {
    await prisma.verificationToken.deleteMany({ where: { token } });
    return "invalid";
  }

  try {
    // The delete is what makes the token single-use, and it is inside the
    // transaction so two simultaneous submits cannot both set a password
    await prisma.$transaction([
      prisma.verificationToken.delete({ where: { token } }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          password: passwordHash,
          // Reading a link sent to that inbox proves exactly what verification
          // proves. Leaving it null would lock the account out again the moment
          // EMAIL_VERIFICATION_ENABLED is turned on.
          emailVerified: user.emailVerified ?? new Date(),
        },
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

  return "reset";
}
