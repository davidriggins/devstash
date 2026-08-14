// Prisma 7 reads CLI configuration from this file. The `prisma` key in
// package.json is no longer supported, and .env is not loaded automatically —
// hence the explicit dotenv import.
import "dotenv/config";
import { defineConfig } from "prisma/config";

// Migrations run over Neon's direct (non-pooled) endpoint when one is set.
// Runtime queries go through the pooled DATABASE_URL via the Neon adapter in
// src/lib/prisma.ts. Falling back keeps single-connection-string setups working.
const migrationUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!migrationUrl) {
  throw new Error(
    "Set DATABASE_URL (and optionally DIRECT_URL) in .env — see .env.example"
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: migrationUrl,
  },
});
