# Current Feature: Environment Badge

## Status

In Progress

## Goals

<!-- Goals & requirements -->

- Show, in the dashboard top bar, which Neon branch the app is actually connected to
- Derive the label from `DATABASE_URL`'s host rather than a separate env var, so it cannot drift from the real connection
- Map known endpoints to friendly names (`development`, `production`) and fall back to the raw endpoint id when unrecognised, so it is never misleading
- Make a production connection visually loud — that is the case worth catching
- Render nothing in a production build, so it can never reach real users
- Never render credentials — host only

## Notes

<!-- Any extra notes -->

- Motivated by this session: `.env` pointed at the production branch while the CLAUDE.md Neon rules assumed development, and nothing in the UI showed it. The dashboard looks identical on both branches because `getCurrentUserId` is hardcoded to the demo user and the sidebar user area is `mockUser`
- Endpoint → branch mapping for this project: `ep-green-truth-aylaseez` = `development` (`br-still-paper-ay42lb16`), `ep-damp-frost-ay6iupf5` = `production` (`br-withered-credit-ayav1rad`)
- Server component; `DATABASE_URL` must never reach the client
- Small, self-contained: a lib function, one component, one line in `Topbar`

### Implementation

- `src/lib/db-environment.ts` — `getDatabaseEnvironment()` parses `DATABASE_URL`, strips the `-pooler` suffix off the host's first label to get the endpoint id, and looks it up in `NEON_ENDPOINT_BRANCHES`. Returns `null` for a missing or unparseable URL so a bad value can't crash the layout
- `src/components/layout/EnvironmentBadge.tsx` — server component, returns `null` when `NODE_ENV === "production"`. `destructive` variant + `TriangleAlert` for production, `outline` + `Database` otherwise; endpoint id in the `title` attribute
- Rendered in `Topbar` between the logo and the search box

### Verified

- Logic covers all seven cases: dev pooler and direct hosts both → `development`; production pooler → `production` with `isProduction: true`; an unknown endpoint reports its own id rather than guessing; `localhost` → `localhost`; unset and unparseable → `null` (badge renders nothing)
- Dashboard shows an outline `DEVELOPMENT` badge against the current `.env`
- Production styling checked by temporarily forcing the value rather than connecting the app to production; reverted from the index straight after, confirmed absent
- `npm run build` and `npm run lint` clean

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
