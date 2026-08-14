/**
 * Smoke test for the Neon/Prisma setup and the seeded demo data.
 *
 * Run with: npm run db:test
 *
 * Checks the connection, fetches and prints the demo user's collections and
 * items, then asserts the data is internally consistent. Exits non-zero on any
 * failure so it can be used in CI.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
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

const DEMO_EMAIL = "demo@devstash.io";
const DEMO_PASSWORD = "12345678";

const EXPECTED_COLLECTIONS = [
  "React Patterns",
  "AI Workflows",
  "DevOps",
  "Terminal Commands",
  "Design Resources",
];

const EXPECTED_ITEM_COUNT = 18;

const failures: string[] = [];

function check(label: string, passed: boolean, detail?: string) {
  console.log(
    `  ${passed ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`
  );
  if (!passed) failures.push(label);
}

/** Host and database only — never log the credentials */
function describeConnection(url: string) {
  try {
    const { hostname, pathname } = new URL(url);
    return `${pathname.slice(1)} @ ${hostname}`;
  } catch {
    return "(unparseable DATABASE_URL)";
  }
}

function preview(text: string, max = 62) {
  const firstLine = text.split("\n")[0].trim();
  return firstLine.length > max ? `${firstLine.slice(0, max - 1)}…` : firstLine;
}

function isValidUrl(value: string) {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

async function main() {
  console.log(`Connecting to ${describeConnection(connectionString!)}`);
  await prisma.$connect();
  console.log("Connected.\n");

  // ---------------------------------------------------------------- counts
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
  console.log(`  tags             ${tags}`);

  // --------------------------------------------------------- system types
  const systemTypes = await prisma.itemType.findMany({
    where: { isSystem: true, userId: null },
    orderBy: { name: "asc" },
  });

  console.log(`\nSystem item types (${systemTypes.length})`);
  for (const type of systemTypes) {
    console.log(
      `  ${type.name.padEnd(9)} ${type.icon.padEnd(11)} ${type.color}`
    );
  }

  // ------------------------------------------------------------ demo user
  const demoUser = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
    include: {
      collections: {
        orderBy: { createdAt: "asc" },
        include: {
          items: {
            orderBy: { addedAt: "asc" },
            include: { item: { include: { itemType: true, tags: true } } },
          },
        },
      },
    },
  });

  if (!demoUser) {
    throw new Error(`Demo user ${DEMO_EMAIL} not found — run npm run db:seed`);
  }

  const passwordValid =
    !!demoUser.password &&
    (await bcrypt.compare(DEMO_PASSWORD, demoUser.password));

  console.log(`\nDemo user: ${demoUser.email}`);
  console.log(`  name           ${demoUser.name}`);
  console.log(`  isPro          ${demoUser.isPro}`);
  console.log(
    `  emailVerified  ${demoUser.emailVerified?.toISOString() ?? "null"}`
  );
  console.log(`  password hash  ${passwordValid ? "verifies" : "INVALID"}`);

  // ------------------------------------------------- demo data, in full
  const allItems = await prisma.item.findMany({
    where: { userId: demoUser.id },
    include: { itemType: true, tags: true, collections: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(
    `\nDemo data (${demoUser.collections.length} collections, ${allItems.length} items)`
  );

  for (const collection of demoUser.collections) {
    const favorite = collection.isFavorite ? " ★" : "";
    console.log(`\n  ${collection.name}${favorite}`);
    console.log(`  ${"─".repeat(collection.name.length + favorite.length)}`);
    console.log(`  ${collection.description ?? ""}`);

    for (const { item } of collection.items) {
      const flags = [
        item.isPinned ? "pinned" : null,
        item.isFavorite ? "favorite" : null,
      ].filter(Boolean);

      const flagText = flags.length > 0 ? `  (${flags.join(", ")})` : "";
      console.log(`\n    [${item.itemType.name}] ${item.title}${flagText}`);
      console.log(`      ${item.description ?? ""}`);

      if (item.url) {
        console.log(`      ${item.url}`);
      }

      if (item.content) {
        const lines = item.content.split("\n").length;
        console.log(
          `      ${preview(item.content)}  (${lines} lines, ${item.content.length} chars)`
        );
      }

      const meta = [
        item.language,
        item.tags.length > 0
          ? `tags: ${item.tags.map((tag) => tag.name).join(", ")}`
          : null,
      ].filter(Boolean);

      if (meta.length > 0) console.log(`      ${meta.join(" · ")}`);
    }
  }

  // ------------------------------------------------------------- assertions
  console.log("\nChecks");

  const missingTypes = EXPECTED_SYSTEM_TYPES.filter(
    (name) => !systemTypes.some((type) => type.name === name)
  );
  check(
    "all 7 system item types present",
    missingTypes.length === 0,
    missingTypes.length > 0 ? `missing ${missingTypes.join(", ")}` : undefined
  );

  check("demo user password verifies", passwordValid);
  check("demo user email is verified", demoUser.emailVerified !== null);
  check("demo user is on the free tier", demoUser.isPro === false);

  const missingCollections = EXPECTED_COLLECTIONS.filter(
    (name) => !demoUser.collections.some((c) => c.name === name)
  );
  check(
    `all ${EXPECTED_COLLECTIONS.length} collections present`,
    missingCollections.length === 0,
    missingCollections.length > 0
      ? `missing ${missingCollections.join(", ")}`
      : undefined
  );

  check(
    `demo user has ${EXPECTED_ITEM_COUNT} items`,
    allItems.length === EXPECTED_ITEM_COUNT,
    `found ${allItems.length}`
  );

  const textItems = allItems.filter((item) => item.contentType === "TEXT");
  const urlItems = allItems.filter((item) => item.contentType === "URL");

  const emptyText = textItems.filter((item) => !item.content?.trim());
  check(
    `TEXT items have content (${textItems.length})`,
    emptyText.length === 0,
    emptyText.length > 0
      ? `empty: ${emptyText.map((i) => i.title).join(", ")}`
      : undefined
  );

  const badUrls = urlItems.filter((item) => !item.url || !isValidUrl(item.url));
  check(
    `URL items have a valid url (${urlItems.length})`,
    badUrls.length === 0,
    badUrls.length > 0
      ? `invalid: ${badUrls.map((i) => i.title).join(", ")}`
      : undefined
  );

  const wrongContentType = allItems.filter((item) =>
    item.itemType.name === "link"
      ? item.contentType !== "URL"
      : item.contentType !== "TEXT"
  );
  check(
    "contentType matches item type",
    wrongContentType.length === 0,
    wrongContentType.length > 0
      ? wrongContentType.map((i) => i.title).join(", ")
      : undefined
  );

  const orphans = allItems.filter((item) => item.collections.length === 0);
  check(
    "every item belongs to a collection",
    orphans.length === 0,
    orphans.length > 0 ? `orphaned: ${orphans.map((i) => i.title).join(", ")}` : undefined
  );

  const untagged = allItems.filter((item) => item.tags.length === 0);
  check(
    "every item has at least one tag",
    untagged.length === 0,
    untagged.length > 0 ? `untagged: ${untagged.map((i) => i.title).join(", ")}` : undefined
  );

  const emptyCollections = demoUser.collections.filter(
    (collection) => collection.items.length === 0
  );
  check(
    "no empty collections",
    emptyCollections.length === 0,
    emptyCollections.length > 0
      ? emptyCollections.map((c) => c.name).join(", ")
      : undefined
  );

  const pinned = allItems.filter((item) => item.isPinned).length;
  const favorites = allItems.filter((item) => item.isFavorite).length;
  check("at least one pinned item", pinned > 0, `${pinned} pinned`);
  check("at least one favorite item", favorites > 0, `${favorites} favorite`);

  const migrations = await prisma.$queryRaw<{ name: string }[]>`
    select migration_name::text as name from _prisma_migrations
    where finished_at is not null order by finished_at`;
  check(
    "migrations applied",
    migrations.length > 0,
    migrations.map((m) => m.name).join(", ")
  );

  if (failures.length > 0) {
    throw new Error(`${failures.length} check(s) failed: ${failures.join("; ")}`);
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
