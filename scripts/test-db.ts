/**
 * Smoke test for the Neon/Prisma setup.
 *
 * Run with: npm run db:test
 *
 * Checks the connection, reports row counts for every model, confirms the
 * system item types are seeded, and lists applied migrations. Exits non-zero
 * on any failure so it can be used in CI.
 */
import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";

import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is not set — copy .env.example to .env");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString }),
});

const EXPECTED_SYSTEM_TYPES = [
  "snippet",
  "prompt",
  "command",
  "note",
  "file",
  "image",
  "link",
];

/** Host and database only — never log the credentials */
function describeConnection(url: string) {
  try {
    const { hostname, pathname } = new URL(url);
    return `${pathname.slice(1)} @ ${hostname}`;
  } catch {
    return "(unparseable DATABASE_URL)";
  }
}

async function main() {
  console.log(`Connecting to ${describeConnection(connectionString!)}`);
  await prisma.$connect();
  console.log("Connected.\n");

  const [users, items, itemTypes, collections, itemCollections, tags] =
    await Promise.all([
      prisma.user.count(),
      prisma.item.count(),
      prisma.itemType.count(),
      prisma.collection.count(),
      prisma.itemCollection.count(),
      prisma.tag.count(),
    ]);

  console.log("Row counts");
  console.log(`  users            ${users}`);
  console.log(`  items            ${items}`);
  console.log(`  item_types       ${itemTypes}`);
  console.log(`  collections      ${collections}`);
  console.log(`  item_collections ${itemCollections}`);
  console.log(`  tags             ${tags}\n`);

  const systemTypes = await prisma.itemType.findMany({
    where: { isSystem: true, userId: null },
    orderBy: { name: "asc" },
  });

  console.log(`System item types (${systemTypes.length})`);
  for (const type of systemTypes) {
    console.log(`  ${type.name.padEnd(9)} ${type.icon.padEnd(11)} ${type.color}`);
  }

  const missing = EXPECTED_SYSTEM_TYPES.filter(
    (name) => !systemTypes.some((type) => type.name === name)
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing system item types: ${missing.join(", ")} — run npm run db:seed`
    );
  }

  const migrations = await prisma.$queryRaw<{ name: string }[]>`
    select migration_name::text as name from _prisma_migrations
    where finished_at is not null order by finished_at`;

  console.log(`\nApplied migrations (${migrations.length})`);
  for (const migration of migrations) {
    console.log(`  ${migration.name}`);
  }

  console.log("\nAll checks passed.");
}

main()
  .catch((error) => {
    console.error("\nDatabase test failed:");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
