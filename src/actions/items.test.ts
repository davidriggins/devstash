import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/user", () => ({ getCurrentUserId: vi.fn() }));
vi.mock("@/lib/db/items", () => ({ updateItem: vi.fn() }));

const { getCurrentUserId } = await import("@/lib/db/user");
const { updateItem: updateItemRecord } = await import("@/lib/db/items");
const { updateItem } = await import("@/actions/items");

const USER_ID = "user_1";

const VALID = {
  title: "useAuth hook",
  description: "Custom authentication hook",
  content: "export function useAuth() {}",
  language: "typescript",
  url: "",
  tags: ["react", "auth"],
};

const SAVED = {
  id: "item_1",
  title: "useAuth hook",
  description: "Custom authentication hook",
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
  type: "snippet" as const,
  tags: ["react", "auth"],
  collections: [],
};

beforeEach(() => {
  vi.mocked(getCurrentUserId).mockReset().mockResolvedValue(USER_ID);
  vi.mocked(updateItemRecord).mockReset().mockResolvedValue(SAVED);
});

describe("updateItem action", () => {
  it("saves and hands back the whole record", async () => {
    const result = await updateItem("item_1", VALID);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(SAVED);
  });

  it("refuses and never writes when nobody is signed in", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue(null);

    const result = await updateItem("item_1", VALID);

    expect(result).toEqual({ success: false, error: "You are not signed in" });
    expect(updateItemRecord).not.toHaveBeenCalled();
  });

  /**
   * The declared `itemId: string` is a compile-time promise only — the argument
   * crosses from a browser, so an empty or non-string id has to be caught here.
   */
  it("rejects an id that is missing or blank without writing", async () => {
    for (const id of ["", "   ", null, undefined, 42]) {
      const result = await updateItem(id as string, VALID);

      expect(result.success).toBe(false);
    }

    expect(updateItemRecord).not.toHaveBeenCalled();
  });

  describe("validation", () => {
    it("rejects an empty title with the schema's own message", async () => {
      const result = await updateItem("item_1", { ...VALID, title: "   " });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Title is required");
      expect(updateItemRecord).not.toHaveBeenCalled();
    });

    it("rejects a malformed URL", async () => {
      const result = await updateItem("item_1", { ...VALID, url: "http" });

      expect(result.success).toBe(false);
      expect(updateItemRecord).not.toHaveBeenCalled();
    });

    it("rejects a payload that is not an object", async () => {
      for (const data of [null, "title", 7, []]) {
        expect((await updateItem("item_1", data)).success).toBe(false);
      }

      expect(updateItemRecord).not.toHaveBeenCalled();
    });

    /**
     * The query gets the *parsed* value, not the raw one. If the raw payload
     * were passed through, an untrimmed title and an empty-string description
     * would reach the database exactly as typed.
     */
    it("passes the normalized payload to the query, not the raw one", async () => {
      await updateItem("item_1", {
        ...VALID,
        title: "  Padded  ",
        description: "   ",
        url: "",
        tags: [" React ", "react", ""],
      });

      expect(updateItemRecord).toHaveBeenCalledWith("item_1", {
        title: "Padded",
        description: null,
        content: VALID.content,
        language: "typescript",
        url: null,
        tags: ["react"],
      });
    });
  });

  /**
   * Missing and not-yours are one answer, matching the detail route. Telling
   * them apart would confirm to anyone guessing that an id is real.
   */
  it("reports a missing item and one owned by someone else identically", async () => {
    vi.mocked(updateItemRecord).mockResolvedValue(null);

    const result = await updateItem("item_1", VALID);

    expect(result).toEqual({
      success: false,
      error: "This item no longer exists",
    });
  });

  it("does not leak the underlying error when the write throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(updateItemRecord).mockRejectedValue(
      new Error("connect ECONNREFUSED 10.0.0.1:5432")
    );

    const result = await updateItem("item_1", VALID);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Could not save this item. Try again.");
    expect(result.error).not.toContain("ECONNREFUSED");
  });
});
