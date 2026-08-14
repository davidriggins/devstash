# Current Feature

<!-- Feature Name -->

## Status

<!-- Not Started|In Progress|Completed -->

In Progress

## Goals

<!-- Goals & requirements -->

Phase 3 of 3 for the dashboard UI layout — the main area. See @context/features/dashboard-phase-3-spec.md.

- Main area content to the right of the sidebar, replacing the phase 1 placeholder
- 4 stats cards across the top: total items, collections, favorite items, favorite collections
- Recent collections as cards, with a "View all" link
- Pinned items
- 10 most recent items

## Notes

<!-- Any extra notes -->

- Reference screenshot: @context/screenshots/dashboard-ui-main.png
- Other references: @context/project-overview.md, @src/lib/mock-data.ts
- Import mock data directly for now — no database yet
- Phases 1 and 2 are done: @context/features/dashboard-phase-1-spec.md, @context/features/dashboard-phase-2-spec.md
- Tailwind v4 — CSS-based config in `src/app/globals.css`, no `tailwind.config.ts`
- The stats cards are not in the screenshot, so their design is ours to choose
- The screenshot labels the collections section "Collections"; the spec calls it recent collections
- The phase 3 spec references `src/lib/mock-data.js` — the actual file is `.ts`
- Item count for the stats card is ambiguous: `mockItems` holds 12 items, while `mockItemTypeCounts` sums to 85
- `/items/[type]` and `/collections/[id]` still don't exist — links can 404 for now

## History

<!-- Keep this updated. Earliest to latest -->

- Initial commit from Create Next App
- Clean up for baseline application
- Lesson 23: Add project context and CLAUDE.md
- Lesson 25: AI workflow & current feature file
- Lesson 27: Dashboard UI prototype
- Dashboard UI Phase 1: shadcn/ui setup, /dashboard route, dark mode default, full-width top bar, sidebar/main placeholders
- Dashboard UI Phase 2: sidebar with type links and item counts, favorite/recent collections, user area; Navigation section with icon-rail collapse, top-bar toggle, and mobile drawer below the top bar
