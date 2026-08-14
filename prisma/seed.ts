/**
 * Seeds development/demo data. Safe to re-run.
 *
 * System item types are matched on (name, userId=null) rather than upserted,
 * because Postgres treats NULLs in a unique constraint as distinct and an
 * upsert would insert duplicates on every run.
 *
 * The demo user's collections and items are deleted and recreated on each run
 * so the data always matches this file. Only that user's rows are touched.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaNeon } from "@prisma/adapter-neon";

import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString }),
});

const DEMO_USER = {
  email: "demo@devstash.io",
  name: "Demo User",
  password: "12345678",
  isPro: false,
};

const PASSWORD_SALT_ROUNDS = 12;

const SYSTEM_ITEM_TYPES = [
  { name: "snippet", icon: "Code", color: "#3b82f6", isSystem: true },
  { name: "prompt", icon: "Sparkles", color: "#8b5cf6", isSystem: true },
  { name: "command", icon: "Terminal", color: "#f97316", isSystem: true },
  { name: "note", icon: "StickyNote", color: "#fde047", isSystem: true },
  { name: "file", icon: "File", color: "#6b7280", isSystem: true },
  { name: "image", icon: "Image", color: "#ec4899", isSystem: true },
  { name: "link", icon: "Link", color: "#10b981", isSystem: true },
];

interface SeedItem {
  title: string;
  type: string;
  description: string;
  content?: string;
  url?: string;
  language?: string;
  tags: string[];
  isFavorite?: boolean;
  isPinned?: boolean;
}

interface SeedCollection {
  name: string;
  description: string;
  isFavorite?: boolean;
  items: SeedItem[];
}

const COLLECTIONS: SeedCollection[] = [
  {
    name: "React Patterns",
    description: "Reusable React patterns and hooks",
    isFavorite: true,
    items: [
      {
        title: "useDebounce Hook",
        type: "snippet",
        description: "Delays a rapidly changing value until input settles",
        language: "typescript",
        tags: ["react", "hooks", "performance"],
        isFavorite: true,
        isPinned: true,
        content: `import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}`,
      },
      {
        title: "Theme Context Provider",
        type: "snippet",
        description: "Context provider with a typed hook and a guard clause",
        language: "typescript",
        tags: ["react", "context", "patterns"],
        content: `"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{
  theme: Theme;
  toggle: () => void;
} | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext value={{ theme, toggle }}>{children}</ThemeContext>
  );
}`,
      },
      {
        title: "cn() Class Name Utility",
        type: "snippet",
        description: "Merges conditional classes and resolves Tailwind conflicts",
        language: "typescript",
        tags: ["react", "tailwind", "utils"],
        content: `import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}`,
      },
    ],
  },
  {
    name: "AI Workflows",
    description: "AI prompts and workflow automations",
    isFavorite: true,
    items: [
      {
        title: "Code Review Prompt",
        type: "prompt",
        description: "Structured review covering correctness, security and perf",
        tags: ["ai", "code-review"],
        isFavorite: true,
        isPinned: true,
        content: `Review the following code as a senior engineer.

Report findings in priority order:
1. Correctness bugs — include the exact input that triggers each one
2. Security issues — injection, authz gaps, leaked secrets
3. Performance — N+1 queries, needless re-renders, unbounded loops
4. Readability — naming, dead code, missing edge-case handling

For each finding give the line, why it matters, and a concrete fix.
Say so plainly if you find nothing worth reporting in a category.`,
      },
      {
        title: "Documentation Generator Prompt",
        type: "prompt",
        description: "Turns a module into reference docs with examples",
        tags: ["ai", "documentation"],
        content: `Write reference documentation for the module below.

Include:
- A one-sentence summary of the module's purpose
- Every exported function: signature, parameters, return value, thrown errors
- A short runnable example per export
- Any non-obvious behaviour or gotcha a caller would hit

Use Markdown. Do not invent behaviour that is not in the source.`,
      },
      {
        title: "Refactoring Assistant Prompt",
        type: "prompt",
        description: "Suggests refactors without changing behaviour",
        tags: ["ai", "refactoring"],
        content: `Suggest refactors for the code below without changing its behaviour.

Focus on:
- Duplication that could collapse into one helper
- Functions doing more than one job
- Nesting that could be flattened with early returns
- Names that do not say what the thing is

For each suggestion show before/after and state the risk of the change.
Skip anything that is purely stylistic preference.`,
      },
    ],
  },
  {
    name: "DevOps",
    description: "Infrastructure and deployment resources",
    items: [
      {
        title: "Multi-stage Dockerfile for Next.js",
        type: "snippet",
        description: "Standalone output build that keeps the runtime image small",
        language: "dockerfile",
        tags: ["docker", "nextjs", "deployment"],
        content: `FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]`,
      },
      {
        title: "Deploy With Migrations",
        type: "command",
        description: "Applies pending migrations before starting the new build",
        language: "bash",
        tags: ["deployment", "prisma"],
        content: `npx prisma migrate deploy && npm run build && npm run start`,
      },
      {
        title: "Docker Compose Documentation",
        type: "link",
        description: "Official reference for Compose file syntax and the CLI",
        url: "https://docs.docker.com/compose/",
        tags: ["docker", "docs"],
      },
      {
        title: "GitHub Actions Documentation",
        type: "link",
        description: "Workflow syntax, triggers and reusable actions",
        url: "https://docs.github.com/en/actions",
        tags: ["ci-cd", "docs"],
      },
    ],
  },
  {
    name: "Terminal Commands",
    description: "Useful shell commands for everyday development",
    isFavorite: true,
    items: [
      {
        title: "Undo Last Commit, Keep Changes",
        type: "command",
        description: "Moves HEAD back one commit and leaves the work staged",
        language: "bash",
        tags: ["git"],
        isFavorite: true,
        content: `git reset --soft HEAD~1`,
      },
      {
        title: "Prune Stopped Containers and Images",
        type: "command",
        description: "Reclaims disk space from unused Docker resources",
        language: "bash",
        tags: ["docker"],
        content: `docker system prune -af --volumes`,
      },
      {
        title: "Kill the Process Holding a Port",
        type: "command",
        description: "Frees a port when a dev server did not shut down cleanly",
        language: "bash",
        tags: ["process", "debugging"],
        content: `lsof -ti:3000 | xargs kill -9`,
      },
      {
        title: "Clean Reinstall of Dependencies",
        type: "command",
        description: "Rules out a corrupted dependency tree",
        language: "bash",
        tags: ["npm", "troubleshooting"],
        content: `rm -rf node_modules package-lock.json && npm install`,
      },
    ],
  },
  {
    name: "Design Resources",
    description: "UI/UX resources and references",
    items: [
      {
        title: "Tailwind CSS Documentation",
        type: "link",
        description: "Utility class reference and theme configuration",
        url: "https://tailwindcss.com/docs",
        tags: ["css", "tailwind", "docs"],
        isFavorite: true,
      },
      {
        title: "shadcn/ui Components",
        type: "link",
        description: "Accessible components you copy into your own codebase",
        url: "https://ui.shadcn.com",
        tags: ["components", "react"],
      },
      {
        title: "Material Design 3",
        type: "link",
        description: "Google's design system guidelines and tokens",
        url: "https://m3.material.io",
        tags: ["design-system", "reference"],
      },
      {
        title: "Lucide Icons",
        type: "link",
        description: "Open source icon set used throughout DevStash",
        url: "https://lucide.dev/icons",
        tags: ["icons", "reference"],
      },
    ],
  },
];

async function seedSystemItemTypes() {
  for (const itemType of SYSTEM_ITEM_TYPES) {
    const existing = await prisma.itemType.findFirst({
      where: { name: itemType.name, userId: null },
    });

    if (existing) {
      await prisma.itemType.update({
        where: { id: existing.id },
        data: itemType,
      });
    } else {
      await prisma.itemType.create({ data: itemType });
    }
  }

  const types = await prisma.itemType.findMany({ where: { userId: null } });
  return new Map(types.map((type) => [type.name, type.id]));
}

async function seedDemoUser() {
  const password = await bcrypt.hash(DEMO_USER.password, PASSWORD_SALT_ROUNDS);

  return prisma.user.upsert({
    where: { email: DEMO_USER.email },
    update: {
      name: DEMO_USER.name,
      password,
      isPro: DEMO_USER.isPro,
      emailVerified: new Date(),
    },
    create: {
      email: DEMO_USER.email,
      name: DEMO_USER.name,
      password,
      isPro: DEMO_USER.isPro,
      emailVerified: new Date(),
    },
  });
}

async function main() {
  console.log("Seeding system item types...");
  const itemTypeIds = await seedSystemItemTypes();
  console.log(`  ${itemTypeIds.size} system item types`);

  console.log("Seeding demo user...");
  const user = await seedDemoUser();
  console.log(`  ${user.email}`);

  // Scoped to the demo user so the data always matches this file
  console.log("Clearing existing demo collections and items...");
  await prisma.item.deleteMany({ where: { userId: user.id } });
  await prisma.collection.deleteMany({ where: { userId: user.id } });

  console.log("Seeding collections and items...");
  let itemCount = 0;

  for (const seedCollection of COLLECTIONS) {
    const collection = await prisma.collection.create({
      data: {
        name: seedCollection.name,
        description: seedCollection.description,
        isFavorite: seedCollection.isFavorite ?? false,
        userId: user.id,
      },
    });

    for (const item of seedCollection.items) {
      const itemTypeId = itemTypeIds.get(item.type);

      if (!itemTypeId) {
        throw new Error(`Unknown item type "${item.type}" on "${item.title}"`);
      }

      await prisma.item.create({
        data: {
          title: item.title,
          contentType: item.type === "link" ? "URL" : "TEXT",
          content: item.content ?? null,
          url: item.url ?? null,
          description: item.description,
          language: item.language ?? null,
          isFavorite: item.isFavorite ?? false,
          isPinned: item.isPinned ?? false,
          userId: user.id,
          itemTypeId,
          tags: {
            connectOrCreate: item.tags.map((name) => ({
              where: { name },
              create: { name },
            })),
          },
          collections: {
            create: { collectionId: collection.id },
          },
        },
      });

      itemCount += 1;
    }

    console.log(`  ${collection.name} (${seedCollection.items.length} items)`);
  }

  console.log(`\nSeeded ${COLLECTIONS.length} collections and ${itemCount} items.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
