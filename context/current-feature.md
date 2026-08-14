# Current Feature

Stats & Sidebar - Real Data

## Status

Completed

## Goals

<!-- Goals & requirements -->

## Notes

<!-- Any extra notes -->

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
</content>
</invoke>
<invoke name="TodoWrite">
<parameter name="todos">[{"content":"Document Stats & Sidebar feature in context/current-feature.md (status: In Progress)","status":"completed","activeForm":"Documenting the feature in current-feature.md"},{"content":"Create branch feature/stats-sidebar","status":"pending","activeForm":"Creating the feature branch"},{"content":"Add sidebar DB functions (per-type item counts, favorite/recent collections) to src/lib/db","status":"pending","activeForm":"Adding sidebar DB functions"},{"content":"Feed SidebarNav real data from a server component and drop mock-data imports","status":"pending","activeForm":"Wiring SidebarNav to real data"},{"content":"Add colored dot for recent collections and the \"View all collections\" link","status":"pending","activeForm":"Adding the collection dot and view-all link"},{"content":"Verify stats cards against database data","status":"pending","activeForm":"Verifying the stats cards"},{"content":"Verify in the browser and run npm run build","status":"pending","activeForm":"Verifying in the browser and building"},{"content":"Commit, merge to main, delete branch (with permission)","status":"pending","activeForm":"Committing, merging and deleting the branch"},{"content":"Mark feature completed and add a history entry","status":"pending","activeForm":"Marking the feature completed"}]