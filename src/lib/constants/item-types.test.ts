import { describe, expect, it } from "vitest";

import {
  getItemTypeHref,
  isItemTypeName,
  isProItemType,
  itemTypeFromSlug,
  ITEM_TYPE_NAMES,
  ITEM_TYPE_SLUGS,
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
