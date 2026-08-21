import { describe, expect, it } from "vitest";

import {
  CONTENT_MAX_LENGTH,
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
