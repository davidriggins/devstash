# Current Feature

<!-- Feature Name -->

## Status

<!-- Not Started|In Progress|Completed -->

Not Started

## Goals

<!-- Goals & requirements -->

Rewrite `prisma/seed.ts` to populate the database with sample data for development and demos. See @context/features/seed-spec.md.

- Demo user: demo@devstash.io / "Demo User", password `12345678` hashed with bcryptjs at 12 rounds, `isPro: false`, `emailVerified` set to the current date
- Keep seeding the 7 system item types (snippet, prompt, command, note, file, image, link) with `isSystem: true`
- 5 collections with 18 items total, all owned by the demo user:
  - React Patterns — 3 TypeScript snippets (custom hooks, component patterns, utilities)
  - AI Workflows — 3 prompts (code review, documentation generation, refactoring)
  - DevOps — 1 snippet, 1 command, 2 links
  - Terminal Commands — 4 commands (git, docker, process management, package managers)
  - Design Resources — 4 links (CSS/Tailwind, component libraries, design systems, icons)
- Links must use real, working URLs
- Overwriting the existing seed file is expected

## Notes

<!-- Any extra notes -->

- `bcryptjs` is not installed yet — it needs adding as a dependency
- The seed must stay idempotent. System types use a `@@unique([name, userId])` where `userId` is null, and Postgres treats NULLs as distinct, so `upsert` silently duplicates them — the current script uses `findFirst` then `create`/`update` for this reason
- Set `contentType` per item: `TEXT` for snippets, prompts, commands and notes; `URL` for links
- Items join collections through the `ItemCollection` table, so collection membership is separate rows
- The spec does not mention tags, and the `Tag` model exists — confirm whether seeded items should carry tags
- Run with `npm run db:seed`; verify afterwards with `npm run db:test`, which currently asserts the 7 system types
- `npm run db:test` will need its expectations widened once real rows exist
- The seeded password is a known plaintext value — development and demo only
- This does not change the UI. The dashboard still imports @src/lib/mock-data.ts directly; switching those reads to Prisma queries is separate work

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
