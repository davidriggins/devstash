/**
 * Deletes every account except the demo user, along with everything it owns.
 *
 * Run with: npm run db:delete-users            (dry run — shows what would go)
 *           npm run db:delete-users -- --yes   (actually deletes)
 *
 * Dry run is the default because this cannot be undone. The listing it prints
 * is the thing to read before adding `--yes`.
 *
 * Refuses to run against the production branch unless `--allow-production` is
 * also passed. `DATABASE_URL` has pointed at production before now, and the
 * command itself gives no hint of which branch it is about to empty.
 *
 * System item types (`userId = null`) are never touched — they are shared, not
 * owned, and the app is unusable without them.
 */
import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";

import { PrismaClient } from "../src/generated/prisma/client";
import { getDatabaseEnvironment } from "../src/lib/db-environment";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

/** Matches prisma/seed.ts — the one account this script preserves */
const DEMO_EMAIL = "demo@devstash.io";

const args = process.argv.slice(2);
const confirmed = args.includes("--yes");
const allowProduction = args.includes("--allow-production");

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString }),
});

async function main() {
  const environment = getDatabaseEnvironment();
  console.log(`Database: ${environment?.label ?? "unknown"} (${environment?.endpoint ?? "?"})`);

  if (environment?.isProduction && !allowProduction) {
    console.error(
      "\nRefusing to run against production. Re-run with --allow-production if that is genuinely what you want."
    );
    process.exit(1);
  }

  const users = await prisma.user.findMany({
    where: { email: { not: DEMO_EMAIL } },
    select: {
      id: true,
      email: true,
      createdAt: true,
      _count: { select: { items: true, collections: true, itemTypes: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  if (users.length === 0) {
    console.log(`\nOnly ${DEMO_EMAIL} remains. Nothing to do.`);
    return;
  }

  console.log(`\n${users.length} account(s) to delete:`);
  for (const user of users) {
    const { items, collections, itemTypes } = user._count;
    console.log(
      `  ${user.email}  —  ${items} item(s), ${collections} collection(s), ${itemTypes} custom type(s)`
    );
  }

  if (!confirmed) {
    console.log("\nDry run. Nothing was deleted.");
    console.log("Re-run with --yes to delete these accounts and their content.");
    return;
  }

  const userIds = users.map((user) => user.id);
  const emails = users.map((user) => user.email);

  // Order matters. Items go before item types because `Item.itemType` is
  // onDelete: Restrict — leaving it to the cascade from `user` would race a
  // custom type against the items still pointing at it. Verification tokens
  // are keyed by email with no foreign key, so nothing cascades them.
  const tokens = await prisma.verificationToken.deleteMany({
    where: { identifier: { in: emails } },
  });
  const items = await prisma.item.deleteMany({ where: { userId: { in: userIds } } });
  const collections = await prisma.collection.deleteMany({
    where: { userId: { in: userIds } },
  });
  const itemTypes = await prisma.itemType.deleteMany({
    where: { userId: { in: userIds } },
  });
  // Accounts and sessions cascade from here
  const deletedUsers = await prisma.user.deleteMany({
    where: { id: { in: userIds } },
  });

  console.log("\nDeleted:");
  console.log(`  ${deletedUsers.count} user(s)`);
  console.log(`  ${items.count} item(s)`);
  console.log(`  ${collections.count} collection(s)`);
  console.log(`  ${itemTypes.count} custom item type(s)`);
  console.log(`  ${tokens.count} verification token(s)`);

  // Tags are shared across users rather than owned by one, so they are left
  // alone. Any that no item points at now are reported instead of removed.
  const orphanedTags = await prisma.tag.count({ where: { items: { none: {} } } });

  if (orphanedTags > 0) {
    console.log(`\n${orphanedTags} tag(s) now have no items. Left in place — tags are shared, not owned.`);
  }

  const remaining = await prisma.user.findMany({
    select: { email: true },
    orderBy: { createdAt: "asc" },
  });
  console.log(`\nRemaining account(s): ${remaining.map((u) => u.email).join(", ")}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
