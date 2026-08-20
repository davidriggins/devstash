import { describe, expect, it } from "vitest";

import { firstParam, safePath } from "@/lib/search-params";

const FALLBACK = "/dashboard";

describe("safePath", () => {
  it("keeps a same-site path, query string and all", () => {
    expect(safePath("/items/snippets", FALLBACK)).toBe("/items/snippets");
    expect(safePath("/items/snippets?item=abc", FALLBACK)).toBe(
      "/items/snippets?item=abc"
    );
  });

  it("falls back when there is nothing to sanitise", () => {
    expect(safePath(undefined, FALLBACK)).toBe(FALLBACK);
    expect(safePath("", FALLBACK)).toBe(FALLBACK);
  });

  /**
   * The whole reason this function exists: `callbackUrl` reaches the server
   * from the client, and an absolute URL there would turn our own sign-in page
   * into an open redirect.
   */
  it("rejects absolute URLs", () => {
    expect(safePath("https://evil.com", FALLBACK)).toBe(FALLBACK);
    expect(safePath("http://evil.com/dashboard", FALLBACK)).toBe(FALLBACK);
  });

  // A leading slash alone is not enough of a check: `//evil.com` is a
  // protocol-relative URL and the browser treats it as off-site
  it("rejects protocol-relative URLs", () => {
    expect(safePath("//evil.com", FALLBACK)).toBe(FALLBACK);
    expect(safePath("//evil.com/path", FALLBACK)).toBe(FALLBACK);
  });

  it("rejects a path that does not start with a slash", () => {
    expect(safePath("dashboard", FALLBACK)).toBe(FALLBACK);
  });
});

describe("firstParam", () => {
  it("takes the first value when a query param repeats", () => {
    expect(firstParam(["a", "b"])).toBe("a");
  });

  it("passes a single value through", () => {
    expect(firstParam("a")).toBe("a");
    expect(firstParam(undefined)).toBeUndefined();
  });

  it("returns undefined for an empty repeat", () => {
    expect(firstParam([])).toBeUndefined();
  });
});
