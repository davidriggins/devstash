# Current Feature: Auth Setup - NextAuth + GitHub Provider

## Status

In Progress

## Goals

<!-- Goals & requirements -->

- Install NextAuth v5 (`next-auth@beta`) and `@auth/prisma-adapter`
- Set up the split auth config pattern for edge compatibility
- Add the GitHub OAuth provider
- Protect `/dashboard/*` routes using the Next.js 16 proxy
- Redirect unauthenticated users to the sign-in page
- Use NextAuth's default sign-in page (no custom pages) for testing

## Notes

<!-- Any extra notes -->

Spec: `context/features/auth-phase-1-spec.md`

**Files to create**

1. `src/auth.config.ts` - edge-compatible config (providers only, no adapter)
2. `src/auth.ts` - full config with Prisma adapter and JWT strategy
3. `src/app/api/auth/[...nextauth]/route.ts` - export handlers from `auth.ts`
4. `src/proxy.ts` - route protection with redirect logic
5. `src/types/next-auth.d.ts` - extend the `Session` type with `user.id`

**Gotchas** (verify current conventions with Context7)

- Install `next-auth@beta`; `@latest` installs v4
- Proxy file lives at `src/proxy.ts`, same level as `app/`
- Named export: `export const proxy = auth(...)`, not a default export
- `session: { strategy: 'jwt' }` is required with the split config pattern
- Do not set `pages.signIn`

**Environment variables**

`AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`

**Testing**

1. `/dashboard` redirects to sign-in when signed out
2. "Sign in with GitHub" completes the OAuth flow
3. Redirect lands back on `/dashboard` after auth

**References**

- Edge compatibility: https://authjs.dev/getting-started/installation#edge-compatibility
- Prisma adapter: https://authjs.dev/getting-started/adapters/prisma

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
