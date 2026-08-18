/**
 * One-off backfill for accounts that predate email verification.
 *
 * Run with: npm run db:backfill-verified
 *
 * Credentials sign-in now refuses an account whose `emailVerified` is null.
 * Every account created before that check existed would be locked out of an
 * app it could use yesterday, with no way back in short of a link to an
 * address that may not even be reachable — so they are grandfathered in.
 *
 * Only touches rows where `emailVerified` is already null, so re-running it
 * changes nothing and it can never un-verify anyone. Prints the affected
 * accounts before writing, since which database `DATABASE_URL` points at is
 * not visible from the command itself.
 */
import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";

import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString }),
});

async function main() {
  // The host says which Neon branch this is about to write to
  console.log(`Database host: ${new URL(connectionString!).host}`);

  const unverified = await prisma.user.findMany({
    where: { emailVerified: null },
    select: { email: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  if (unverified.length === 0) {
    console.log("No unverified accounts. Nothing to do.");
    return;
  }

  console.log(`\nMarking ${unverified.length} account(s) verified:`);
  for (const user of unverified) {
    console.log(`  ${user.email}  (created ${user.createdAt.toISOString()})`);
  }

  const { count } = await prisma.user.updateMany({
    where: { emailVerified: null },
    data: { emailVerified: new Date() },
  });

  console.log(`\nDone. ${count} account(s) updated.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
