# DevStash

A developer knowledge hub for snippets, commands, prompts, notes, files, images, links and custom types.

## Context Files

Read the following to get the full context of the project:

- @context/project-overview.md
- @context/coding-standards.md
- @context/ai-interaction.md
- @context/current-feature.md

## Commands

- **Dev server**: `npm run dev` (runs on http://localhost:3000)
- **Build**: `npm run build`
- **Production server**: `npm run start`
- **Lint**: `npm run lint`
- **Test**: `npm run test` (single run)
- **Test watch**: `npm run test:watch`

## Database Commands

- **Generate client**: `npm run db:generate`
- **Create migration**: `npm run db:migrate` (dev)
- **Apply migrations**: `npm run db:deploy` (production)
- **Seed**: `npm run db:seed`
- **Studio**: `npm run db:studio`
- **Connection test**: `npm run db:test` (prints seeded data and asserts consistency)

## Neon MCP

**CRITICAL**: These rules apply to every Neon MCP tool call, without exception.

- **Project**: Always use the `DevStash` project, ID `withered-frog-37243323`. Never operate on any other Neon project, even if one matches by name.
- **Branch**: Always pass an explicit `branchId` for the `development` branch. Never rely on the default branch — the default is `production`.
- **Resolving the branch**: Do not hardcode a branch ID from memory. Call `describe_project` with the project ID and pick the branch named `development`.
- **Never touch production**: The `production` branch (`br-withered-credit-ayav1rad`) is off limits for reads and writes alike. Only use it when I name it explicitly in that request; permission for one request never carries to the next.
- **If `development` does not exist**: Stop and tell me. Do not fall back to `production`, and do not create the branch without asking.
- **Destructive SQL** (`DROP`, `DELETE`, `TRUNCATE`, `UPDATE`/`ALTER` without a `WHERE`) requires my confirmation first, even on `development`.
- **Schema changes** still go through Prisma migrations (`npm run db:migrate`), never through raw SQL over MCP. See the migration warning in @context/project-overview.md.
- **IMPORTANT** Do not add Claude to any commit messages
