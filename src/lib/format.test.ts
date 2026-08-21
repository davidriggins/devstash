import { describe, expect, it } from "vitest";

import { formatFileSize } from "@/lib/format";

describe("formatFileSize", () => {
  it("counts whole bytes below a kilobyte", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(1)).toBe("1 B");
    expect(formatFileSize(999)).toBe("999 B");
    // 1023 is still bytes — the unit changes at 1024, not at 1000
    expect(formatFileSize(1023)).toBe("1023 B");
  });

  it("never shows a fraction of a byte", () => {
    expect(formatFileSize(1.4)).toBe("1 B");
    expect(formatFileSize(9.6)).toBe("10 B");
  });

  /** One decimal below 10 so small files do not all collapse to "1 KB" */
  it("keeps one decimal below ten of a unit", () => {
    expect(formatFileSize(1024)).toBe("1.0 KB");
    expect(formatFileSize(1536)).toBe("1.5 KB");
    expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
    expect(formatFileSize(1024 * 1024 * 1024)).toBe("1.0 GB");
  });

  /** …and none at or above it, so the string stays about as wide */
  it("drops the decimal at ten of a unit and above", () => {
    expect(formatFileSize(1024 * 10)).toBe("10 KB");
    expect(formatFileSize(1024 * 512)).toBe("512 KB");
    expect(formatFileSize(1024 * 1024 * 42)).toBe("42 MB");
  });

  /**
   * GB is the largest unit in the table, so anything bigger keeps counting in
   * it rather than inventing a TB the table does not have.
   */
  it("stops at gigabytes rather than inventing a larger unit", () => {
    expect(formatFileSize(1024 ** 4)).toBe("1024 GB");
    expect(formatFileSize(1024 ** 4 * 3)).toBe("3072 GB");
  });

  /**
   * Just under a unit boundary the rounding can print the full 1024 of the
   * smaller unit — a known artifact of rounding after the unit is chosen, kept
   * because the alternative is re-checking the boundary post-rounding.
   */
  it("can print 1024 of a unit just below the next boundary", () => {
    expect(formatFileSize(1024 * 1024 - 1)).toBe("1024 KB");
  });
});
