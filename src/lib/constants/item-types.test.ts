import { describe, expect, it } from "vitest";

import {
  CODE_ITEM_TYPES,
  CREATABLE_ITEM_TYPES,
  getItemTypeHref,
  hasEditableField,
  isCreatableItemType,
  isItemTypeName,
  isProItemType,
  itemTypeFromSlug,
  ITEM_TYPE_CONTENT_TYPES,
  ITEM_TYPE_NAMES,
  ITEM_TYPE_SLUGS,
  usesCodeEditor,
} from "@/lib/constants/item-types";

describe("itemTypeFromSlug", () => {
  it("resolves every slug back to the name it came from", () => {
    for (const name of ITEM_TYPE_NAMES) {
      expect(itemTypeFromSlug(ITEM_TYPE_SLUGS[name])).toBe(name);
    }
  });

  it("returns null for a slug that names no type", () => {
    expect(itemTypeFromSlug("widgets")).toBeNull();
    expect(itemTypeFromSlug("")).toBeNull();
  });

  it("does not accept the singular type name as a slug", () => {
    expect(itemTypeFromSlug("snippet")).toBeNull();
  });

  /**
   * Regression. The first version built its lookup with `Object.fromEntries`,
   * and a plain-object lookup walks the prototype chain — so these returned
   * truthy values that the `?? null` fallback never caught, carrying a non-type
   * past the route's `notFound()` check and into a 500. `/items/widgets`
   * passing had made the guard look correct.
   */
  it.each(["constructor", "__proto__", "toString", "valueOf", "hasOwnProperty"])(
    "returns null for %s, inherited from Object.prototype",
    (slug) => {
      expect(itemTypeFromSlug(slug)).toBeNull();
    }
  );
});

describe("getItemTypeHref", () => {
  it("round-trips through itemTypeFromSlug", () => {
    for (const name of ITEM_TYPE_NAMES) {
      const slug = getItemTypeHref(name).replace("/items/", "");
      expect(itemTypeFromSlug(slug)).toBe(name);
    }
  });
});

describe("isItemTypeName", () => {
  it("accepts every known name and rejects anything else", () => {
    for (const name of ITEM_TYPE_NAMES) {
      expect(isItemTypeName(name)).toBe(true);
    }

    expect(isItemTypeName("widget")).toBe(false);
    expect(isItemTypeName("snippets")).toBe(false);
  });

  // Same prototype-chain trap as the slug lookup, via the `in` operator
  it("rejects inherited Object properties", () => {
    expect(isItemTypeName("constructor")).toBe(false);
    expect(isItemTypeName("toString")).toBe(false);
  });
});

describe("ITEM_TYPE_CONTENT_TYPES", () => {
  /**
   * `satisfies Record<ItemTypeName, ContentType>` already proves the table is
   * complete and that every value is one of the three enum members. What it
   * cannot prove is that each type got the *right* one — `file: "TEXT"` would
   * typecheck happily. The schema does not tie `contentType` to the type row,
   * so this table is the only thing keeping the two agreed.
   */
  it("maps every type to the column that actually holds its content", () => {
    expect(ITEM_TYPE_CONTENT_TYPES).toEqual({
      snippet: "TEXT",
      prompt: "TEXT",
      command: "TEXT",
      note: "TEXT",
      file: "FILE",
      image: "FILE",
      link: "URL",
    });
  });
});

describe("CREATABLE_ITEM_TYPES", () => {
  /**
   * What the "New Item" type picker renders. Derived by filtering out the
   * FILE-backed types rather than listed by hand, so this pins the result of
   * that filter — including the canonical order, which the picker inherits.
   */
  it("is the five types that can be created by typing, in canonical order", () => {
    expect(CREATABLE_ITEM_TYPES).toEqual([
      "snippet",
      "prompt",
      "command",
      "note",
      "link",
    ]);
  });

  /**
   * The reason file and image are absent is not that they are Pro — it is that
   * their columns come from an upload. Stated as a property so a future
   * FILE-backed type is excluded without anyone remembering to.
   */
  it("excludes exactly the types whose content comes from an upload", () => {
    for (const name of ITEM_TYPE_NAMES) {
      const creatable = CREATABLE_ITEM_TYPES.includes(name);

      expect(creatable).toBe(ITEM_TYPE_CONTENT_TYPES[name] !== "FILE");
    }
  });
});

describe("isCreatableItemType", () => {
  /**
   * The invariant that spans the client and the server: the picker offers
   * `CREATABLE_ITEM_TYPES`, the schema accepts whatever this guard accepts, and
   * a disagreement means the dialog either offers a type the action refuses or
   * hides one it would take.
   */
  it("accepts exactly what the type picker offers", () => {
    for (const name of ITEM_TYPE_NAMES) {
      expect(isCreatableItemType(name)).toBe(CREATABLE_ITEM_TYPES.includes(name));
    }
  });

  it("rejects the types that need an upload", () => {
    expect(isCreatableItemType("file")).toBe(false);
    expect(isCreatableItemType("image")).toBe(false);
  });

  it("rejects a name that is not a type at all", () => {
    expect(isCreatableItemType("widget")).toBe(false);
    expect(isCreatableItemType("snippets")).toBe(false);
    expect(isCreatableItemType("")).toBe(false);
  });

  /**
   * It routes through `isItemTypeName` rather than indexing the content-type
   * table directly, which is what keeps the prototype-chain trap handled in one
   * place. Pinned here because the value arrives from a form.
   */
  it("rejects inherited Object properties", () => {
    for (const name of [
      "constructor",
      "__proto__",
      "toString",
      "valueOf",
      "hasOwnProperty",
    ]) {
      expect(isCreatableItemType(name)).toBe(false);
    }
  });
});

describe("usesCodeEditor", () => {
  /**
   * Which types get Monaco instead of a textarea. Pinned by name because the
   * spec named them: everything else — prose, links, uploads — keeps the plain
   * control.
   */
  it("is snippet and command, and nothing else", () => {
    expect(CODE_ITEM_TYPES).toEqual(["snippet", "command"]);

    for (const name of ITEM_TYPE_NAMES) {
      expect(usesCodeEditor(name)).toBe(name === "snippet" || name === "command");
    }
  });

  /**
   * Derived rather than listed, so state the property as well as the result: a
   * code type is one that stores a language next to its content. A future type
   * that does the same is picked up without anyone editing this table.
   */
  it("is exactly the types that store a language alongside content", () => {
    for (const name of ITEM_TYPE_NAMES) {
      const isCode =
        hasEditableField(name, "content") && hasEditableField(name, "language");

      expect(usesCodeEditor(name)).toBe(isCode);
    }
  });

  /** A prompt and a note carry content, and must keep the textarea */
  it("leaves prose types with content on the plain control", () => {
    expect(hasEditableField("prompt", "content")).toBe(true);
    expect(hasEditableField("note", "content")).toBe(true);
    expect(usesCodeEditor("prompt")).toBe(false);
    expect(usesCodeEditor("note")).toBe(false);
  });
});

describe("isProItemType", () => {
  it("marks only file and image as Pro", () => {
    expect(isProItemType("file")).toBe(true);
    expect(isProItemType("image")).toBe(true);

    for (const name of ITEM_TYPE_NAMES.filter(
      (n) => n !== "file" && n !== "image"
    )) {
      expect(isProItemType(name)).toBe(false);
    }
  });
});
