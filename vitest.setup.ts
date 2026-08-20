/**
 * Nothing in this suite may reach a database.
 *
 * `src/lib/prisma.ts` throws at import time when `DATABASE_URL` is unset, so
 * clearing it turns an unmocked Prisma import into a loud, immediate failure
 * rather than a live connection to Neon. Vitest does not load `.env` the way
 * Next does, so this is usually true already — stating it here makes it a
 * guarantee instead of an accident, which is worth doing in a project whose
 * `.env` has pointed at the production branch before.
 *
 * Tests that exercise `DATABASE_URL` parsing set and restore it themselves.
 */
delete process.env.DATABASE_URL;
