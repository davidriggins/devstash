# Current Feature

<!-- Feature Name -->

## Status

<!-- Not Started|In Progress|Completed -->

Completed

## Goals

<!-- Goals & requirements -->

Phase 1 of 3 for the dashboard UI layout. See @context/features/dashboard-phase-1-spec.md.

- Initialize shadcn/ui and install the components needed for the shell
- Dashboard route at `/dashboard`
- Main dashboard layout plus any global styles
- Dark mode by default
- Top bar with search and "New Item" button (display only, non-functional)
- Placeholder sidebar and main area — just an `h2` reading "Sidebar" and "Main" for now

## Notes

<!-- Any extra notes -->

- Reference screenshot: @context/screenshots/dashboard-ui-main.png
- Other references: @context/project-overview.md, @src/lib/mock-data.ts
- Later phases: @context/features/dashboard-phase-2-spec.md, @context/features/dashboard-phase-3-spec.md
- Tailwind v4 — CSS-based config in `src/app/globals.css`, no `tailwind.config.ts`
- Top bar spans the full page width with the app icon + "DevStash" at far left, above the sidebar
- Mock data actually lives at `src/app/lib/mock-data.ts`, not `src/lib/mock-data.ts` as the specs reference — move it before phase 2

## History

<!-- Keep this updated. Earliest to latest -->

- Initial commit from Create Next App
- Clean up for baseline application
- Lesson 23: Add project context and CLAUDE.md
- Lesson 25: AI workflow & current feature file
- Lesson 27: Dashboard UI prototype
- Dashboard UI Phase 1: shadcn/ui setup, /dashboard route, dark mode default, full-width top bar, sidebar/main placeholders
