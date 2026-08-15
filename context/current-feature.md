# Current Feature: Fix Sidebar Group Collapse on Mobile

## Status

In Progress

## Goals

Collapsing the sidebar to the icon rail on desktop and then narrowing to a mobile
viewport leaves the drawer's "Types" and "Collections" headers unable to collapse —
the chevron rotates but the rows stay on screen.

- `SidebarGroup` in `src/components/layout/SidebarNav.tsx` renders its children when
  `isExpanded || isRail`. Rail mode has to keep them mounted so the icons stay visible,
  and the collapse button is hidden by `RAIL_HIDDEN` there, so the override is correct
  on desktop.
- `isRail` is never reset on resize, and the rail toggle is `hidden md:inline-flex`,
  so on mobile the header button is visible and clickable while `isRail` still forces
  the rows open.
- Fix: treat rail mode as expanded only on desktop. `isMobile` is already on the
  `useSidebar()` context, so the gate becomes `isExpanded || (isRail && !isMobile)`.

## Notes

- One-line change in a single file; no other component reads `isRail` for this purpose.
- Consistent with the rest of the sidebar: `RAIL_HIDDEN` and `RAIL_CENTER` in
  `sidebar-styles.ts` are already `md:`-prefixed, so rail mode was desktop-only
  everywhere except this one JS gate. `useIsMobile` tests `max-width: 767px`, the exact
  complement of Tailwind's `md:`, so the two agree at every viewport width.
- Verified in the browser: rail on desktop → narrow below `md` → both group headers
  collapse in the drawer → widen and the rail icons still show.
- Source: codebase scan, 2026-08-14 (low-risk quick win #5).

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
