# Current Feature: Auth Credentials - Email/Password Provider

## Status

In Progress

## Goals

<!-- Goals & requirements -->

- Add a Credentials provider for email/password sign-in alongside the existing GitHub OAuth
- Hash passwords with bcryptjs (already installed)
- Ensure the `User.password` field exists — add it via a Prisma migration if it isn't already in the schema
- `auth.config.ts`: add the Credentials provider with an `authorize: () => null` placeholder (keeps Prisma/bcrypt off the edge)
- `auth.ts`: override the Credentials provider with the real bcrypt validation logic
- Create a registration API route at `POST /api/auth/register` that accepts name, email, password, confirmPassword; validates the passwords match; rejects an existing email; hashes the password; creates the user; returns a success/error response
- Verify: registration via curl, sign in at `/api/auth/signin` with email/password, redirect to `/dashboard`, and GitHub OAuth still working

## Notes

<!-- Any extra notes -->

- Spec: @context/features/auth-phase-2-spec.md
- Builds on auth phase 1's split config pattern — `auth.config.ts` stays edge-safe, `auth.ts` is the Node-only layer with Prisma
- Credentials provider docs: https://authjs.dev/getting-started/authentication/credentials
- Existing seed already creates a demo user with a hashed password, so the schema likely has `password` already — confirm before writing a migration
- `getCurrentUserId` still returns the hardcoded demo user from phase 1; not in scope here unless the spec's testing steps require it

### Implementation

- No migration needed — `User.password String?` was already in the initial schema and the seed hashes into it
- `zod` added as a direct dependency (it was only a transitive one); coding-standards mandates Zod for input validation
- `src/lib/validation/auth.ts` holds `signInSchema` and `registerSchema` so the route and `authorize` share one set of rules; a shared `emailSchema` trims and lowercases *before* validating — `z.email()` carries its format check at the base, so a trailing `.trim()` would never run on input the check had already rejected (caught in review: `"  padded@test.com  "` was 400ing)
- `auth.config.ts` exports `CREDENTIALS_PROVIDER_ID` and `credentialFields` alongside the placeholder provider; `auth.ts` maps over `authConfig.providers` and swaps the entry with that id for the bcrypt-backed one, so provider order and field shape stay defined in one place
- `authorize` returns `null` (never throws) for bad input, unknown email, GitHub-only accounts with no password, and a failed `bcrypt.compare`
- Register route salts at 12 rounds to match `prisma/seed.ts`, and catches Prisma `P2002` so a signup race reports 409 rather than 500

### Verified

- `POST /api/auth/register` → 201; duplicate email → 409; mismatched passwords, short password, bad email, missing fields, malformed JSON → 400 with a specific message
- Email normalization end to end: `"  padded@test.com  "` registers as `padded@test.com`, a follow-up `" PADDED@test.com "` correctly 409s against that row, and signing in with `"  PADDED@test.com  "` returns a session for the same user id
- `/dashboard` while signed out still redirects to the sign-in page, which now renders both the GitHub button and the email/password form
- Signing in as the registered user lands on `/dashboard` with no console errors; a wrong password stays on the sign-in page with `error=CredentialsSignin`
- GitHub OAuth handoff still reaches github.com with the right callback URL (full round-trip left for manual sign-in, same as phase 1)
- `npm run build` and `npm run lint` both clean

### Environment note

- Verification ran against the **production** branch by mistake: `.env`'s `DATABASE_URL` pointed at `ep-damp-frost-ay6iupf5` (= `br-withered-credit-ayav1rad`, production), not the `development` branch the CLAUDE.md Neon rules assume. Three test users were created there; `mixedcase@test.com` and `padded@test.com` were deleted, `test@test.com` kept
- `.env` now points at the `development` branch (`ep-green-truth-aylaseez` / `br-still-paper-ay42lb16`); old file saved as `.env.bak`. `.env.production` still points at production, which is correct
- Restart the dev server after this change — `src/lib/prisma.ts` caches the client on `globalThis`, so an env reload alone keeps the old connection
- Before running write tests through the app, check which branch `DATABASE_URL` resolves to; scoping Neon MCP calls to `development` does not constrain the app itself

## History

<!-- Keep this updated. Earliest to latest -->

- Initial commit from Create Next App
- Clean up for baseline application
- Lesson 23: Add project context and CLAUDE.md
- Lesson 25: AI workflow & current feature file
- Lesson 27: Dashboard UI prototype
- Dashboard UI Phase 1: shadcn/ui setup, /dashboard route, dark mode default, full-width top bar, sidebar/main placeholders
- Dashboard UI Phase 2: sidebar with type links and item counts, favorite/recent collections, user area; Navigation section with icon-rail collapse, top-bar toggle, and mobile drawer below the top bar
- Dashboard UI Phase 3: main area with stats cards, recent collections grid, pinned items and the 10 most recent items
- Database: Prisma 7 with Neon Postgres, initial schema and migration, driver adapter, system item type seed, and a db:test script
- Seed data: demo user with hashed password, 5 collections and 18 tagged items, plus a db:test that prints the data and asserts its consistency
- Dashboard collections: real collection data from Neon via `src/lib/db/collections.ts`, card accent from the most-used type, icon row for every type in the collection, and a dynamically rendered dashboard route
- Dashboard items: pinned and recent items from Neon via `src/lib/db/items.ts`, real stats card counts, item row icon and border from the item's own type, and a request-cached current user lookup
- Stats & sidebar: system item types with real per-type counts via `getItemTypeCounts`, favorite and recent collections via `getSidebarCollections`, a colored dot for each recent collection's most-used type, a "View all collections" link, and the dashboard layout fetching both for the sidebar
- Pro badge: `PRO_ITEM_TYPES` and `isProItemType` in the item type constants, and a subtle outline `Badge` on the Files and Images rows in the sidebar between the label and the count, hidden in collapsed rail mode; visual marker only, no route gating yet
- Sidebar group collapse on mobile: `SidebarGroup` now treats icon-rail mode as forced-open only on desktop, so the drawer's "Types" and "Collections" headers collapse again after a desktop rail state carries over to a mobile viewport; brings the JS gate in line with the `md:`-prefixed rail styles in `sidebar-styles.ts`
- Auth phase 1 (NextAuth + GitHub): split config keeping Prisma off the edge — `src/auth.config.ts` holds the GitHub provider alone while `src/auth.ts` adds `PrismaAdapter` over the existing prisma singleton, a JWT session strategy, and a session callback copying `token.sub` onto `session.user.id`; `src/proxy.ts` exports a named `proxy` guarding `/dashboard/*` and redirecting signed-out visitors to NextAuth's built-in sign-in page with a `callbackUrl`; `src/types/next-auth.d.ts` narrows `user.id` to a required string. Verified the redirect, the sign-in page and the GitHub OAuth handoff; the full round-trip back to `/dashboard` was left for manual sign-in. Note: `getCurrentUserId` still returns the hardcoded demo user, so the dashboard shows demo data no matter who signs in
