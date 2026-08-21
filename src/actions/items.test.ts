import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/user", () => ({ getCurrentUserId: vi.fn() }));
vi.mock("@/lib/db/items", () => ({
  createItem: vi.fn(),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
}));

const { getCurrentUserId } = await import("@/lib/db/user");
const {
  createItem: createItemRecord,
  updateItem: updateItemRecord,
  deleteItem: deleteItemRecord,
} = await import("@/lib/db/items");
const { createItem, deleteItem, updateItem } = await import("@/actions/items");

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
  vi.mocked(createItemRecord).mockReset().mockResolvedValue(SAVED);
  vi.mocked(updateItemRecord).mockReset().mockResolvedValue(SAVED);
  vi.mocked(deleteItemRecord).mockReset().mockResolvedValue(true);
});

/** What the dialog sends: every field, whatever type is selected */
const NEW_ITEM = { type: "snippet", ...VALID };

describe("createItem action", () => {
  it("creates and hands back the whole record", async () => {
    const result = await createItem(NEW_ITEM);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(SAVED);
  });

  it("refuses and never writes when nobody is signed in", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue(null);

    const result = await createItem(NEW_ITEM);

    expect(result).toEqual({ success: false, error: "You are not signed in" });
    expect(createItemRecord).not.toHaveBeenCalled();
  });

  describe("validation", () => {
    it("rejects an empty title with the schema's own message", async () => {
      const result = await createItem({ ...NEW_ITEM, title: "   " });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Title is required");
      expect(createItemRecord).not.toHaveBeenCalled();
    });

    /**
     * The dialog only offers the five creatable types, but the payload arrives
     * from a browser and nothing about that list is enforced on the way in.
     */
    it("rejects a type that needs an upload, or is not a type at all", async () => {
      for (const type of ["file", "image", "widget", "constructor", 1, null]) {
        const result = await createItem({ ...NEW_ITEM, type });

        expect(result.success).toBe(false);
      }

      expect(createItemRecord).not.toHaveBeenCalled();
    });

    it("rejects a link with no URL", async () => {
      const result = await createItem({ ...NEW_ITEM, type: "link", url: "" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("A link needs a URL");
      expect(createItemRecord).not.toHaveBeenCalled();
    });

    it("rejects a payload that is not an object", async () => {
      for (const data of [null, "title", 7, []]) {
        expect((await createItem(data)).success).toBe(false);
      }

      expect(createItemRecord).not.toHaveBeenCalled();
    });

    /**
     * The columns a caller must never set. `contentType` is derived from the
     * type at the write, and letting one through would put the enum and the
     * type row into exactly the disagreement the schema does not prevent;
     * `userId` decides ownership; `isPinned` and `isFavorite` have their own
     * mutations. None are declared in the schema, so the parse drops them —
     * this pins that, because the query spreads what it is handed.
     */
    it("drops fields the schema never declared", async () => {
      await createItem({
        ...NEW_ITEM,
        id: "item_stolen",
        userId: "user_2",
        itemTypeId: "type_forced",
        contentType: "URL",
        isPinned: true,
        isFavorite: true,
        createdAt: new Date("2000-01-01"),
      });

      const payload = vi.mocked(createItemRecord).mock.calls[0][0];

      for (const key of [
        "id",
        "userId",
        "itemTypeId",
        "contentType",
        "isPinned",
        "isFavorite",
        "createdAt",
      ]) {
        expect(payload).not.toHaveProperty(key);
      }
    });

    /**
     * The query gets the *parsed* value. Passing the raw payload through would
     * put an untrimmed title and an empty-string description into the database
     * exactly as typed, and leave the tags un-normalized.
     */
    it("passes the normalized payload to the query, not the raw one", async () => {
      await createItem({
        ...NEW_ITEM,
        title: "  Padded  ",
        description: "   ",
        url: "",
        tags: [" React ", "react", ""],
      });

      expect(createItemRecord).toHaveBeenCalledWith({
        type: "snippet",
        title: "Padded",
        description: null,
        content: VALID.content,
        language: "typescript",
        url: null,
        tags: ["react"],
      });
    });
  });

  /** A missing system type row reads the same as any other failed write */
  it("reports a refused write without saying why", async () => {
    vi.mocked(createItemRecord).mockResolvedValue(null);

    const result = await createItem(NEW_ITEM);

    expect(result).toEqual({
      success: false,
      error: "Could not create this item. Try again.",
    });
  });

  it("does not leak the underlying error when the write throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(createItemRecord).mockRejectedValue(
      new Error("connect ECONNREFUSED 10.0.0.1:5432")
    );

    const result = await createItem(NEW_ITEM);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Could not create this item. Try again.");
    expect(result.error).not.toContain("ECONNREFUSED");
  });
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

describe("deleteItem action", () => {
  it("deletes and reports success with nothing to hand back", async () => {
    const result = await deleteItem("item_1");

    expect(result).toEqual({ success: true });
    expect(deleteItemRecord).toHaveBeenCalledWith("item_1");
  });

  it("refuses and never deletes when nobody is signed in", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue(null);

    const result = await deleteItem("item_1");

    expect(result).toEqual({ success: false, error: "You are not signed in" });
    expect(deleteItemRecord).not.toHaveBeenCalled();
  });

  /**
   * The id crosses the Server Action boundary from a browser, where TypeScript's
   * guarantees have already run out, so its shape is checked here rather than
   * assumed from the parameter type.
   */
  it("refuses an empty or blank id before querying", async () => {
    for (const id of ["", "   "]) {
      const result = await deleteItem(id);

      expect(result.success).toBe(false);
      expect(deleteItemRecord).not.toHaveBeenCalled();
    }
  });

  it("refuses an id that is not a string at all", async () => {
    const result = await deleteItem(42 as unknown as string);

    expect(result.success).toBe(false);
    expect(deleteItemRecord).not.toHaveBeenCalled();
  });

  /**
   * Missing and not-yours have to read identically. The query already collapses
   * them into one `false`; this pins that the action does not reintroduce the
   * distinction on its way back out.
   */
  it("reports a missing item and someone else's item in the same words", async () => {
    vi.mocked(deleteItemRecord).mockResolvedValue(false);

    const result = await deleteItem("item_1");

    expect(result).toEqual({
      success: false,
      error: "This item no longer exists",
    });
  });

  it("does not leak the underlying error when the delete throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(deleteItemRecord).mockRejectedValue(
      new Error("connect ECONNREFUSED 10.0.0.1:5432")
    );

    const result = await deleteItem("item_1");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Could not delete this item. Try again.");
    expect(result.error).not.toContain("ECONNREFUSED");
  });
});
