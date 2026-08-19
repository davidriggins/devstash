import bcrypt from "bcryptjs";

/**
 * Every place that writes a password hash goes through here. Registration and
 * password reset both do, so the cost factor cannot drift between them.
 */

// Matches prisma/seed.ts so seeded and registered passwords hash the same way
export const PASSWORD_SALT_ROUNDS = 12;

export function hashPassword(password: string) {
  return bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
}
