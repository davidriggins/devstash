# AI Interaction Guidelines

## Communication

- Be concise and direct
- Explain non-obvious decisions briefly
- Ask before large refactors or architectural changes
- Don't add features not in the project spec
- Never delete files without clarification

## Workflow

This is the common workflow that we will use for every single feature/fix:

1. **Document** - Document the feature in @context/current-feature.md.
2. **Branch** - Create new branch for feature, fix, etc
3. **Implement** - Implement the feature/fix that I create in @context/current-feature.md
4. **Test** - Write unit tests for any server action or utility the change touches, and run `npm run test`. Verify the UI in the browser — components are not unit tested. Run `npm run build` and fix any errors
5. **Iterate** - Iterate and change things if needed
6. **Commit** - Only after build passes and everything works
7. **Merge** - Merge to main
8. **Delete Branch** - Delete branch after merge
9. **Review** - Review AI-generated code periodically and on demand.
10. Mark as completed in @context/current-feature.md and add to history

Do NOT commit without permission and until the build passes. If build fails, fix the issues first.

## Testing

Vitest, running in Node. Unit tests cover **server actions and utilities only** — no
component tests, no jsdom. Components are verified in the browser, which is where their
real failures show up anyway.

- Tests sit next to the code as `*.test.ts` (`src/lib/foo.ts` → `src/lib/foo.test.ts`)
- Import from `vitest` explicitly rather than enabling globals
- **Nothing may reach a database.** `vitest.setup.ts` clears `DATABASE_URL`, so an
  unmocked Prisma import fails loudly instead of connecting. Mock `@/lib/prisma`,
  `@/auth` and `@/lib/db/*` in action tests
- Write the test that reproduces a bug before fixing it, so the fix has a witness
- Worth testing: input validation, anything parsing untrusted input (route params,
  query strings, env vars), auth branching, and the shape of what an action writes

## Branching

We will create a new branch for every feature/fix. Name branch **feature/[feature]** or **fix[fix]**, etc. Ask to delete the branch once merged.

## Commits

- Ask before committing (don't auto-commit)
- Use conventional commit messages (feat:, fix:, chore:, etc.)
- Keep commits focused (one feature/fix per commit)
- Never put "Generated With Claude" in the commit messages

## When Stuck

- If something isn't working after 2-3 attempts, stop and explain the issue
- Don't keep trying random fixes
- Ask for clarification if requirements are unclear

## Code Changes

- Make minimal changes to accomplish the task
- Don't refactor unrelated code unless asked
- Don't add "nice to have" features
- Preserve existing patterns in the codebase

## Code Review

Review AI-generated code periodically, especially for:

- Security (auth checks, input validation)
- Performance (unnecessary re-renders, N+1 queries)
- Logic errors (edge cases)
- Patterns (matches existing codebase?)
