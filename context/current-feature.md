# Current Feature

<!-- Feature Name -->

## Status

<!-- Not Started|In Progress|Completed -->

In Progress

## Goals

<!-- Goals & requirements -->

Set up Prisma ORM against Neon PostgreSQL. See @context/features/database-spec.md.

- Neon PostgreSQL (serverless) as the database
- Prisma 7 as the ORM
- Initial schema from the data models in @context/project-overview.md: User, Item, ItemType, Collection, ItemCollection, Tag
- NextAuth models: Account, Session, VerificationToken
- Appropriate indexes and cascade deletes
- Seed the 7 system item types
- Create migrations only — never push the schema directly

## Notes

<!-- Any extra notes -->

- Prisma 7 has breaking changes — read the full upgrade guide before writing any code: https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7
- Setup reference: https://www.prisma.io/docs/getting-started/prisma-orm/quickstart/prisma-postgres
- `DATABASE_URL` points at the Neon development branch; production is a separate branch
- `npx prisma migrate dev --name <name>` in development, `npx prisma migrate deploy` for production. Never `prisma db push` unless explicitly told to
- The schema is expected to evolve — this is the initial cut, not the final shape
- The seed script is specified in @context/project-overview.md, not in the database spec
- This feature is schema and tooling only. The dashboard still imports @src/lib/mock-data.ts directly; swapping those reads for real queries is separate work
- When real data does land: `SidebarNav` is a client component, so anything it imports ships to the browser. Fetch in server components and pass down as props rather than importing data modules into the client graph

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
