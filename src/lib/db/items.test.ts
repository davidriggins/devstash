import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

/**
 * `@/lib/prisma` throws at import time without DATABASE_URL, which
 * `vitest.setup.ts` clears on purpose, so an unmocked import here would fail
 * loudly rather than open a connection to Neon.
 */
vi.mock("@/lib/db/user", () => ({ getCurrentUserId: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { item: { findFirst: vi.fn() } },
}));

const { getCurrentUserId } = await import("@/lib/db/user");
const { prisma } = await import("@/lib/prisma");
const { getItemById } = await import("@/lib/db/items");

/**
 * Untyped on purpose. `findFirst`'s own signature promises the full `Item`
 * payload, but the query narrows it with a `select`, so a fixture matching what
 * the code actually reads would not satisfy it. Typing the fixture instead
 * would mean listing columns this function never asks for.
 */
const findFirst = prisma.item.findFirst as unknown as Mock;

const USER_ID = "user_1";

function itemRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "item_1",
    title: "useAuth hook",
    description: "Custom authentication hook",
    content: "export function useAuth() {}",
    url: null,
    fileUrl: null,
    fileName: null,
    fileSize: null,
    language: "typescript",
    isFavorite: true,
    isPinned: false,
    createdAt: new Date("2026-01-15"),
    updatedAt: new Date("2026-02-01"),
    itemType: { name: "snippet" },
    tags: [{ name: "react" }, { name: "auth" }],
    collections: [{ collection: { id: "col_1", name: "React Patterns" } }],
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(getCurrentUserId).mockReset().mockResolvedValue(USER_ID);
  findFirst.mockReset().mockResolvedValue(itemRecord());
});

describe("getItemById", () => {
  /**
   * The id arrives from the URL, so it is whatever the sender typed. Signed
   * out, the answer must not depend on the id at all — no query, so not even
   * response timing can say whether that id exists.
   */
  it("returns null without querying when nobody is signed in", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue(null);

    expect(await getItemById("item_1")).toBeNull();
    expect(prisma.item.findFirst).not.toHaveBeenCalled();
  });

  /**
   * The ownership check has to be part of the `where`. Looking an item up by id
   * alone and testing the owner afterwards leaves a branch that could return
   * someone else's item; this way there is no such branch.
   */
  it("scopes the lookup to the signed-in user", async () => {
    await getItemById("item_1");

    expect(prisma.item.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "item_1", userId: USER_ID } })
    );
  });

  it("returns null when the item is missing or belongs to someone else", async () => {
    findFirst.mockResolvedValue(null);

    expect(await getItemById("item_1")).toBeNull();
  });

  it("flattens tags and collections for the drawer", async () => {
    const item = await getItemById("item_1");

    expect(item?.tags).toEqual(["react", "auth"]);
    expect(item?.collections).toEqual([{ id: "col_1", name: "React Patterns" }]);
  });

  it("keeps the fields the card never loads", async () => {
    const item = await getItemById("item_1");

    expect(item?.content).toBe("export function useAuth() {}");
    expect(item?.language).toBe("typescript");
    expect(item?.updatedAt).toEqual(new Date("2026-02-01"));
  });

  /**
   * Same fallback the cards use: a type name the UI has no constants for must
   * not reach `ITEM_TYPE_ICONS`. `constructor` is the case worth pinning — it
   * is a real string a custom type could carry, and a prototype-chain lookup
   * would answer it with a function rather than a component.
   */
  it("falls back to note for a type the UI has no constants for", async () => {
    for (const name of ["widget", "constructor", "__proto__", "toString"]) {
      findFirst.mockResolvedValue(
        itemRecord({ itemType: { name } })
      );

      expect((await getItemById("item_1"))?.type).toBe("note");
    }
  });

  it("selects the item's collections, which the list queries do not", async () => {
    await getItemById("item_1");

    const args = findFirst.mock.calls[0][0];
    expect(args?.select).toHaveProperty("collections");
    expect(args?.select).toHaveProperty("content");
  });
});
