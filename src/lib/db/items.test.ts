import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

/**
 * `@/lib/prisma` throws at import time without DATABASE_URL, which
 * `vitest.setup.ts` clears on purpose, so an unmocked import here would fail
 * loudly rather than open a connection to Neon.
 */
vi.mock("@/lib/db/user", () => ({ getCurrentUserId: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    item: { findFirst: vi.fn(), update: vi.fn() },
    // The real one runs the callback against a transaction client; handing back
    // the same mock keeps `tx.item.*` pointing at the spies asserted on below
    $transaction: vi.fn(),
  },
}));

const { getCurrentUserId } = await import("@/lib/db/user");
const { prisma } = await import("@/lib/prisma");
const { getItemById, updateItem } = await import("@/lib/db/items");

/**
 * Untyped on purpose. `findFirst`'s own signature promises the full `Item`
 * payload, but the query narrows it with a `select`, so a fixture matching what
 * the code actually reads would not satisfy it. Typing the fixture instead
 * would mean listing columns this function never asks for.
 */
const findFirst = prisma.item.findFirst as unknown as Mock;
const update = prisma.item.update as unknown as Mock;
const transaction = prisma.$transaction as unknown as Mock;

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
  update.mockReset().mockResolvedValue(itemRecord());
  transaction.mockReset().mockImplementation((run: (tx: unknown) => unknown) =>
    run(prisma)
  );
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

const EDIT = {
  title: "Renamed",
  description: "New description",
  content: "console.log(1)",
  language: "javascript",
  url: "https://example.com",
  tags: ["react", "auth"],
};

/** The `data` argument of the single `item.update` call */
function updateData() {
  return update.mock.calls[0][0].data;
}

describe("updateItem", () => {
  it("returns null without touching the database when nobody is signed in", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue(null);

    expect(await updateItem("item_1", EDIT)).toBeNull();
    expect(transaction).not.toHaveBeenCalled();
  });

  /**
   * Both statements carry the ownership filter. The read alone would be enough
   * today, but a `where: { id }` on the write is one refactor away from being
   * the only check that ever ran — and that refactor would look harmless.
   */
  it("scopes both the read and the write to the signed-in user", async () => {
    await updateItem("item_1", EDIT);

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "item_1", userId: USER_ID } })
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "item_1", userId: USER_ID } })
    );
  });

  it("does not write when the item is missing or belongs to someone else", async () => {
    findFirst.mockResolvedValue(null);

    expect(await updateItem("item_1", EDIT)).toBeNull();
    expect(update).not.toHaveBeenCalled();
  });

  it("runs the read and the write in one transaction", async () => {
    await updateItem("item_1", EDIT);

    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it("writes title and description for every type", async () => {
    findFirst.mockResolvedValue(itemRecord({ itemType: { name: "image" } }));

    await updateItem("item_1", EDIT);

    expect(updateData()).toMatchObject({
      title: "Renamed",
      description: "New description",
    });
  });

  /**
   * The type gate is the point of reading the row first. The form hides the
   * fields a type does not own, but the payload arrives from a browser, so a
   * link must not be able to smuggle `content` in and a snippet must not be
   * able to set a `url`.
   */
  it("writes only the columns the item's own type owns", async () => {
    const cases = [
      { type: "snippet", writes: ["content", "language"], ignores: ["url"] },
      { type: "prompt", writes: ["content"], ignores: ["url", "language"] },
      { type: "command", writes: ["content", "language"], ignores: ["url"] },
      { type: "note", writes: ["content"], ignores: ["url", "language"] },
      { type: "link", writes: ["url"], ignores: ["content", "language"] },
      { type: "file", writes: [], ignores: ["content", "url", "language"] },
      { type: "image", writes: [], ignores: ["content", "url", "language"] },
    ];

    for (const { type, writes, ignores } of cases) {
      update.mockClear();
      findFirst.mockResolvedValue(itemRecord({ itemType: { name: type } }));

      await updateItem("item_1", EDIT);

      for (const field of writes) {
        expect(updateData()).toHaveProperty(field);
      }

      for (const field of ignores) {
        expect(updateData()).not.toHaveProperty(field);
      }
    }
  });

  /** An unrecognised type name falls back to note, which owns content only */
  it("treats a type the UI has no constants for as a note", async () => {
    findFirst.mockResolvedValue(itemRecord({ itemType: { name: "constructor" } }));

    await updateItem("item_1", EDIT);

    expect(updateData()).toHaveProperty("content");
    expect(updateData()).not.toHaveProperty("url");
  });

  /**
   * `set: []` before `connectOrCreate` in the same nested write, so the item's
   * tag list is replaced rather than added to. The `Tag` rows are shared and
   * are never deleted here.
   */
  it("replaces the tag list with connect-or-create", async () => {
    await updateItem("item_1", EDIT);

    expect(updateData().tags).toEqual({
      set: [],
      connectOrCreate: [
        { where: { name: "react" }, create: { name: "react" } },
        { where: { name: "auth" }, create: { name: "auth" } },
      ],
    });
  });

  it("clears every tag when none are given", async () => {
    await updateItem("item_1", { ...EDIT, tags: [] });

    expect(updateData().tags).toEqual({ set: [], connectOrCreate: [] });
  });

  it("returns the saved record flattened as an ItemDetail", async () => {
    update.mockResolvedValue(
      itemRecord({ title: "Renamed", tags: [{ name: "react" }] })
    );

    const saved = await updateItem("item_1", EDIT);

    expect(saved?.title).toBe("Renamed");
    expect(saved?.tags).toEqual(["react"]);
    expect(saved?.collections).toEqual([{ id: "col_1", name: "React Patterns" }]);
  });
});
