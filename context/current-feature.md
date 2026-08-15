# Current Feature: Add Pro Badge to Sidebar

## Status

In Progress

## Goals

- Show a `PRO` badge next to the Files item type in the sidebar
- Show a `PRO` badge next to the Images item type in the sidebar
- Use the shadcn/ui `Badge` component for both
- Badge label is uppercase `PRO`
- Styling is clean and subtle so it does not compete with the type label or item count

## Notes

- Spec: `context/features/add-pro-badge-sidebar.md`
- Files and Images are the two Pro-only system types per the project overview; the badge is a visual marker only, no gating behaviour in this feature
- Sidebar type links are rendered in the sidebar nav component, which already renders each type's icon, label and item count — the badge slots into that row
- Sidebar collapses to an icon rail on desktop and becomes a drawer on tablet/mobile; check the badge does not break the collapsed rail
- `Badge` may not be installed yet — add it via `npx shadcn@latest add badge` if missing

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
