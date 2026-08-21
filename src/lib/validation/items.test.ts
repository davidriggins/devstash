import { describe, expect, it } from "vitest";

import {
  CONTENT_MAX_LENGTH,
  createItemSchema,
  MAX_TAGS,
  TITLE_MAX_LENGTH,
  updateItemSchema,
} from "@/lib/validation/items";

/** The payload the drawer sends when nothing has been typed into it */
function payload(overrides: Record<string, unknown> = {}) {
  return {
    title: "useAuth hook",
    description: "",
    content: "",
    language: "",
    url: "",
    tags: [],
    ...overrides,
  };
}

function parse(overrides: Record<string, unknown> = {}) {
  return updateItemSchema.safeParse(payload(overrides));
}

describe("updateItemSchema", () => {
  describe("title", () => {
    it("trims before deciding whether it is empty", () => {
      const result = parse({ title: "  Padded title  " });

      expect(result.success).toBe(true);
      expect(result.data?.title).toBe("Padded title");
    });

    /**
     * The client disables Save on an empty title, which is a courtesy and not a
     * check. Whitespace is the case that slips past a naive `length > 0` guard.
     */
    it("rejects an empty or whitespace-only title", () => {
      for (const title of ["", "   ", "\t\n"]) {
        expect(parse({ title }).success).toBe(false);
      }
    });

    it("rejects a title over the length cap", () => {
      expect(parse({ title: "a".repeat(TITLE_MAX_LENGTH) }).success).toBe(true);
      expect(parse({ title: "a".repeat(TITLE_MAX_LENGTH + 1) }).success).toBe(
        false
      );
    });
  });

  describe("optional text", () => {
    /**
     * The columns are nullable and the drawer reads null as "nothing here", so
     * an empty input has to land as null. Storing "" would give the same state
     * two representations and only one of them would be checked for.
     */
    it("turns empty and whitespace-only input into null", () => {
      const result = parse({ description: "   ", content: "", language: "  " });

      expect(result.data?.description).toBeNull();
      expect(result.data?.content).toBeNull();
      expect(result.data?.language).toBeNull();
    });

    it("treats a missing field the same as a cleared one", () => {
      const result = updateItemSchema.safeParse({ title: "Just a title" });

      expect(result.success).toBe(true);
      expect(result.data?.description).toBeNull();
      expect(result.data?.content).toBeNull();
      expect(result.data?.url).toBeNull();
      expect(result.data?.tags).toEqual([]);
    });

    it("accepts an explicit null", () => {
      expect(parse({ description: null }).data?.description).toBeNull();
    });

    it("rejects content over the length cap", () => {
      expect(
        parse({ content: "a".repeat(CONTENT_MAX_LENGTH + 1) }).success
      ).toBe(false);
    });
  });

  describe("url", () => {
    it("accepts a valid URL and keeps it trimmed", () => {
      expect(parse({ url: "  https://example.com/docs  " }).data?.url).toBe(
        "https://example.com/docs"
      );
    });

    /** Clearing the field is allowed; a half-typed one is not */
    it("distinguishes an empty URL from a malformed one", () => {
      expect(parse({ url: "" }).data?.url).toBeNull();
      expect(parse({ url: "   " }).data?.url).toBeNull();
      expect(parse({ url: "http" }).success).toBe(false);
      expect(parse({ url: "not a url" }).success).toBe(false);
    });
  });

  describe("tags", () => {
    it("trims, drops empties and lowercases", () => {
      const result = parse({ tags: [" React ", "", "  ", "HOOKS"] });

      expect(result.data?.tags).toEqual(["react", "hooks"]);
    });

    /**
     * `Tag.name` is unique globally rather than per user, so "React" and
     * "react" would be two rows nothing joins back together. Lowercasing is
     * what keeps one tag from fragmenting across the whole table.
     */
    it("collapses tags that differ only in case", () => {
      expect(parse({ tags: ["React", "react", "REACT"] }).data?.tags).toEqual([
        "react",
      ]);
    });

    it("drops duplicates so connectOrCreate never sees the same name twice", () => {
      expect(parse({ tags: ["auth", "auth", " auth "] }).data?.tags).toEqual([
        "auth",
      ]);
    });

    it("rejects more than the cap", () => {
      const tags = Array.from({ length: MAX_TAGS + 1 }, (_, i) => `tag-${i}`);

      expect(parse({ tags }).success).toBe(false);
      expect(parse({ tags: tags.slice(0, MAX_TAGS) }).success).toBe(true);
    });

    it("rejects a single tag over the length cap", () => {
      expect(parse({ tags: ["a".repeat(51)] }).success).toBe(false);
    });

    it("rejects a non-array", () => {
      expect(parse({ tags: "react, hooks" }).success).toBe(false);
    });
  });
});

/** What the create dialog sends: the same fields, plus the chosen type */
function createPayload(overrides: Record<string, unknown> = {}) {
  return { type: "snippet", ...payload(overrides) };
}

function parseCreate(overrides: Record<string, unknown> = {}) {
  return createItemSchema.safeParse(createPayload(overrides));
}

describe("createItemSchema", () => {
  describe("type", () => {
    it("accepts every type that can be created by typing", () => {
      for (const type of ["snippet", "prompt", "command", "note", "link"]) {
        // A link needs a URL, which the rule below covers on its own
        const url = type === "link" ? "https://example.com" : "";

        expect(parseCreate({ type, url }).success).toBe(true);
      }
    });

    /**
     * File and image are real item types, and they are still refused here: both
     * need `fileUrl`, `fileName` and `fileSize`, which come from an upload that
     * does not exist. One created through this path would be a `FILE` row with
     * no file in it.
     */
    it("rejects the types that need an upload", () => {
      expect(parseCreate({ type: "file" }).success).toBe(false);
      expect(parseCreate({ type: "image" }).success).toBe(false);
    });

    it("rejects an unknown type", () => {
      for (const type of ["widget", "", "SNIPPET", "Snippet"]) {
        expect(parseCreate({ type }).success).toBe(false);
      }
    });

    /**
     * The type arrives from a form, so the prototype-chain trap applies here as
     * much as it does to a route param: a plain-object lookup would answer
     * `"constructor"` with a function, and it would be truthy.
     */
    it("rejects inherited property names", () => {
      for (const type of [
        "constructor",
        "__proto__",
        "toString",
        "hasOwnProperty",
      ]) {
        expect(parseCreate({ type }).success).toBe(false);
      }
    });

    it("rejects a missing or non-string type", () => {
      expect(createItemSchema.safeParse(payload()).success).toBe(false);
      expect(parseCreate({ type: 1 }).success).toBe(false);
      expect(parseCreate({ type: null }).success).toBe(false);
    });
  });

  describe("link URL", () => {
    /**
     * The one type-specific rule enforced here rather than at the write. A link
     * with no URL has no content at all, and `optionalUrl` has to allow empty
     * so the six types that never render the field can leave it blank.
     */
    it("requires a URL when the type is link", () => {
      expect(parseCreate({ type: "link", url: "" }).success).toBe(false);
      expect(parseCreate({ type: "link", url: "   " }).success).toBe(false);
      expect(
        parseCreate({ type: "link", url: "https://example.com" }).success
      ).toBe(true);
    });

    it("reports the missing URL against the url field", () => {
      const result = parseCreate({ type: "link", url: "" });

      expect(result.error?.issues[0]?.path).toEqual(["url"]);
    });

    /** A malformed URL is still malformed, not merely missing */
    it("still rejects a half-typed URL for a link", () => {
      expect(parseCreate({ type: "link", url: "http" }).success).toBe(false);
    });

    it("leaves the URL optional for every other type", () => {
      for (const type of ["snippet", "prompt", "command", "note"]) {
        const result = parseCreate({ type, url: "" });

        expect(result.success).toBe(true);
        expect(result.data?.url).toBeNull();
      }
    });
  });

  /**
   * Both schemas spread the same field definitions, so these are here to catch
   * that spread being broken rather than to re-test the rules themselves.
   */
  describe("fields shared with updateItemSchema", () => {
    it("applies the same title rules", () => {
      expect(parseCreate({ title: "   " }).success).toBe(false);
      expect(parseCreate({ title: "  Padded  " }).data?.title).toBe("Padded");
      expect(
        parseCreate({ title: "a".repeat(TITLE_MAX_LENGTH + 1) }).success
      ).toBe(false);
    });

    it("applies the same empty-to-null transform", () => {
      const result = parseCreate({ description: "  ", content: "", language: "" });

      expect(result.data?.description).toBeNull();
      expect(result.data?.content).toBeNull();
      expect(result.data?.language).toBeNull();
    });

    it("applies the same tag normalization", () => {
      expect(
        parseCreate({ tags: [" React ", "REACT", "", "hooks"] }).data?.tags
      ).toEqual(["react", "hooks"]);
    });
  });
});
