import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ItemDetail } from "@/types/dashboard";

/**
 * `@/lib/db/items` is mocked whole, which also keeps `@/lib/prisma` from ever
 * loading — it throws at import time without DATABASE_URL, cleared on purpose
 * by `vitest.setup.ts`.
 */
vi.mock("@/lib/db/user", () => ({ getCurrentUserId: vi.fn() }));
vi.mock("@/lib/db/items", () => ({ getItemById: vi.fn() }));

const { getCurrentUserId } = await import("@/lib/db/user");
const { getItemById } = await import("@/lib/db/items");
const { GET } = await import("@/app/api/items/[id]/route");

const ITEM: ItemDetail = {
  id: "item_1",
  title: "useAuth hook",
  description: null,
  content: "export function useAuth() {}",
  url: null,
  fileUrl: null,
  fileName: null,
  fileSize: null,
  language: "typescript",
  isFavorite: false,
  isPinned: false,
  createdAt: new Date("2026-01-15"),
  updatedAt: new Date("2026-02-01"),
  type: "snippet",
  tags: ["react"],
  collections: [{ id: "col_1", name: "React Patterns" }],
};

/** The shape Next hands a route handler: params arrive as a promise */
function context(id: string) {
  return { params: Promise.resolve({ id }) } as Parameters<typeof GET>[1];
}

function request() {
  return new Request("http://localhost/api/items/item_1");
}

beforeEach(() => {
  vi.mocked(getCurrentUserId).mockReset().mockResolvedValue("user_1");
  vi.mocked(getItemById).mockReset().mockResolvedValue(ITEM);
});

describe("GET /api/items/[id]", () => {
  /**
   * The session check runs before the lookup, so a signed-out caller cannot
   * make the server touch an id at all.
   */
  it("answers 401 without looking anything up when nobody is signed in", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue(null);

    const response = await GET(request(), context("item_1"));

    expect(response.status).toBe(401);
    expect(getItemById).not.toHaveBeenCalled();
  });

  /**
   * 404 rather than 403 for an item that exists but is someone else's — which
   * is what `getItemById` reports as null. A 403 would confirm the id is real,
   * turning the endpoint into an oracle for anyone enumerating ids.
   */
  it("answers 404 for a missing item and for another user's item alike", async () => {
    vi.mocked(getItemById).mockResolvedValue(null);

    const response = await GET(request(), context("item_1"));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      success: false,
      error: "Item not found",
    });
  });

  it("returns the item to its owner", async () => {
    const response = await GET(request(), context("item_1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBe("item_1");
    expect(body.content).toBe("export function useAuth() {}");
    expect(body.collections).toEqual([{ id: "col_1", name: "React Patterns" }]);
  });

  /**
   * Dates cross as ISO strings, which is why the client revives them rather
   * than using the response as-is.
   */
  it("serialises dates as ISO strings", async () => {
    const body = await (await GET(request(), context("item_1"))).json();

    expect(body.createdAt).toBe("2026-01-15T00:00:00.000Z");
    expect(body.updatedAt).toBe("2026-02-01T00:00:00.000Z");
  });

  /**
   * The id is a URL segment, so it is whatever the sender typed. It must reach
   * the query untouched — the scoping is `getItemById`'s job, and sanitising
   * it here would only hide which layer is responsible.
   */
  it("passes the raw route param through to the query", async () => {
    for (const id of ["item_1", "constructor", "__proto__", "' OR 1=1--", ""]) {
      vi.mocked(getItemById).mockClear();

      await GET(request(), context(id));

      expect(getItemById).toHaveBeenCalledWith(id);
    }
  });

  it("answers 500 without leaking the underlying error", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    vi.mocked(getItemById).mockRejectedValue(new Error("connection refused"));

    const response = await GET(request(), context("item_1"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Could not load this item. Try again.");
    expect(JSON.stringify(body)).not.toContain("connection refused");

    consoleError.mockRestore();
  });
});
