# Current Feature: Auth UI - Sign In, Register & Sign Out

## Status

In Progress

## Goals

<!-- Goals & requirements -->

- Replace the NextAuth default pages with custom UI, and surface the signed-in user in the sidebar's user area
- **Sign in page (`/sign-in`)**: email and password fields, a "Sign in with GitHub" button, a link to the register page, and form validation with error display
- **Register page (`/register`)**: name, email, password and confirm-password fields, validation (passwords match, email format), submits to `POST /api/auth/register`, redirects to sign-in on success
- **Sidebar user area**: user avatar (GitHub `image`, else initials), user name, and a dropdown on avatar click containing "Sign out"; clicking the icon navigates to `/profile`
- **Reusable avatar component** handling both the image and initials cases (e.g. "Brad Traversy" → "BT")

## Notes

<!-- Any extra notes -->

- Spec: @context/features/auth-phase-3-spec.md
- Builds on auth phases 1 and 2 — the GitHub and Credentials providers, `/api/auth/register`, and the shared Zod rules in `src/lib/validation/auth.ts` all already exist. This phase is UI only; reuse those validation schemas on the client rather than restating the rules.
- `src/proxy.ts` currently redirects to NextAuth's built-in sign-in page; it needs to point at `/sign-in`, and `authConfig` needs a `pages.signIn` entry so NextAuth's own redirects follow suit.
- Two open points in the spec, both resolved toward the Requirements section unless told otherwise:
  - Requirements say the avatar lives at the **bottom of the sidebar**, but testing steps 4–5 say the **top bar**. Going with the sidebar user area, which already exists from Dashboard UI Phase 2.
  - The spec has the avatar click both opening the dropdown and navigating to `/profile`. Plan: avatar/user row opens the dropdown; the dropdown holds a "Profile" link to `/profile` plus "Sign out".
- `/profile` is not part of this spec beyond being linked to. No page will be built for it here.
- `getCurrentUserId` still returns the hardcoded demo user (noted in auth phase 1), so dashboard data stays demo data even once a real user is signed in. Out of scope here unless the sidebar name/avatar must match the real session — which it must, so the sidebar user area reads from `auth()` directly, not from the demo user.

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
- Auth phase 2 (email/password Credentials): `src/auth.config.ts` declares Credentials with an `authorize: () => null` placeholder and exports `CREDENTIALS_PROVIDER_ID` and `credentialFields`, so provider order and field shape are defined once; `src/auth.ts` maps over `authConfig.providers` and swaps that entry for a bcrypt-backed provider whose `authorize` returns `null` (never throws) for bad input, unknown email, GitHub-only accounts with no password, and a failed `bcrypt.compare`. `POST /api/auth/register` validates with Zod, rejects duplicate emails, and catches Prisma `P2002` so a signup race reports 409 rather than 500. `src/lib/validation/auth.ts` shares the rules between the route and `authorize`; its `emailSchema` trims and lowercases *before* validating, because `z.email()` carries its format check at the base and a trailing `.trim()` would never run — review caught `"  padded@test.com  "` returning 400. No migration needed: `User.password` was already in the initial schema; salt rounds match `prisma/seed.ts` at 12. Added `zod` as a direct dependency and gitignored `.playwright-mcp`. Verified registration and every validation path by curl, email normalization end to end, credentials sign-in landing on `/dashboard`, wrong password giving `CredentialsSignin`, and the GitHub handoff still intact. Note: verification initially ran against the **production** Neon branch — `.env`'s `DATABASE_URL` pointed there, which the CLAUDE.md Neon rules do not govern; test users were cleaned up and `.env` repointed to `development` (`ep-green-truth-aylaseez` / `br-still-paper-ay42lb16`), with `.env.production` correctly left on production. Check which branch `DATABASE_URL` resolves to before running write tests through the app, and restart the dev server after changing it since `src/lib/prisma.ts` caches the client on `globalThis`
- Environment badge: `src/lib/db-environment.ts` exposes `getDatabaseEnvironment()`, which parses `DATABASE_URL`, strips a `-pooler` suffix off the host's first label to get the Neon endpoint id, and maps it through `NEON_ENDPOINT_BRANCHES` (`ep-green-truth-aylaseez` = development, `ep-damp-frost-ay6iupf5` = production). Deriving it from the connection string rather than a separate env var is deliberate — a separate var can drift from the real connection, which is the failure being guarded against. An unrecognised endpoint reports its own id instead of guessing, and a missing or unparseable URL returns `null` so it can never crash the layout. `src/components/layout/EnvironmentBadge.tsx` is a server component rendering that label in `Topbar` between the logo and the search box: `destructive` variant with `TriangleAlert` for production, `outline` with `Database` otherwise, endpoint id in the `title`. Returns `null` when `NODE_ENV === "production"`, and only the label crosses to the client — never the connection string. Written because a dev server pointed at production looked identical to one pointed at development. Verified the mapping across pooler and direct hosts, an unknown endpoint, `localhost`, and unset/unparseable URLs; production styling was checked by temporarily forcing the value rather than connecting the app to production
