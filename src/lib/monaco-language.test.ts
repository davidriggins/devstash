import { describe, expect, it } from "vitest";

import {
  PLAIN_TEXT_LANGUAGE,
  resolveMonacoLanguage,
  toMonacoLanguage,
  type MonacoLanguageEntry,
} from "@/lib/monaco-language";

/**
 * A slice of Monaco's real registry, copied from the ids and aliases in
 * `monaco-editor/esm/vs/languages/definitions/*​/register.js`. Real values
 * rather than invented ones, because the whole point of these cases is which
 * shorthands Monaco does and does not already know.
 */
const REGISTRY: MonacoLanguageEntry[] = [
  { id: "typescript", aliases: ["TypeScript", "ts", "typescript"] },
  { id: "javascript", aliases: ["JavaScript", "javascript", "js"] },
  { id: "shell", aliases: ["Shell", "sh"] },
  { id: "python", aliases: ["Python", "py"] },
  { id: "yaml", aliases: ["YAML", "yaml", "YML", "yml"] },
  { id: "markdown", aliases: ["Markdown", "markdown"] },
  { id: "csharp", aliases: ["C#", "csharp"] },
  { id: "cpp", aliases: ["C++", "Cpp", "cpp"] },
  { id: "pgsql", aliases: ["PostgreSQL", "postgres", "pg", "postgre"] },
  { id: "dockerfile", aliases: ["Dockerfile"] },
  // Monaco leaves aliases off some entries; this must not throw
  { id: "plaintext" },
];

describe("toMonacoLanguage", () => {
  it("falls back to plain text when there is no language", () => {
    expect(toMonacoLanguage(null)).toBe(PLAIN_TEXT_LANGUAGE);
    expect(toMonacoLanguage(undefined)).toBe(PLAIN_TEXT_LANGUAGE);
    expect(toMonacoLanguage("")).toBe(PLAIN_TEXT_LANGUAGE);
    expect(toMonacoLanguage("   ")).toBe(PLAIN_TEXT_LANGUAGE);
  });

  it("maps bash to shell", () => {
    // The reason this module exists: `bash` is the most common language in the
    // app's own data and Monaco has no alias for it, so without the mapping
    // most commands would render with no highlighting at all
    expect(toMonacoLanguage("bash")).toBe("shell");
  });

  it("ignores case and surrounding whitespace", () => {
    expect(toMonacoLanguage("  BASH  ")).toBe("shell");
    expect(toMonacoLanguage("TypeScript")).toBe("typescript");
  });

  it("passes through anything it has no alias for, lowercased", () => {
    // Monaco knows far more ids than this table restates, and resolves its own
    // aliases at the call site — an unknown id becomes plain text there
    expect(toMonacoLanguage("python")).toBe("python");
    expect(toMonacoLanguage("Dockerfile")).toBe("dockerfile");
    expect(toMonacoLanguage("ts")).toBe("ts");
    expect(toMonacoLanguage("wombat")).toBe("wombat");
  });

  it("returns a plain string for keys inherited from Object.prototype", () => {
    // The value comes from a free-text column, so these are reachable input. A
    // plain-object lookup would answer with the constructor or a function here,
    // which no `?? fallback` catches — the same trap caught twice before in
    // `itemTypeFromSlug` and `isItemTypeName`
    for (const key of ["constructor", "__proto__", "toString", "valueOf"]) {
      const result = toMonacoLanguage(key);

      expect(typeof result).toBe("string");
      expect(result).toBe(key.toLowerCase());
    }
  });
});

describe("resolveMonacoLanguage", () => {
  it("matches a registered id", () => {
    expect(resolveMonacoLanguage("python", REGISTRY)).toBe("python");
    expect(resolveMonacoLanguage("dockerfile", REGISTRY)).toBe("dockerfile");
  });

  /**
   * The bug this function was rewritten for. `ts`, `js`, `py`, `sh` and `yml`
   * are Monaco *aliases*, not ids — an id-only match sent all of them to plain
   * text, which is most of the shorthands anyone would actually type.
   */
  it("matches an alias and answers with the id, not the alias", () => {
    expect(resolveMonacoLanguage("ts", REGISTRY)).toBe("typescript");
    expect(resolveMonacoLanguage("js", REGISTRY)).toBe("javascript");
    expect(resolveMonacoLanguage("py", REGISTRY)).toBe("python");
    expect(resolveMonacoLanguage("sh", REGISTRY)).toBe("shell");
    expect(resolveMonacoLanguage("yml", REGISTRY)).toBe("yaml");
  });

  it("matches aliases whatever the casing on either side", () => {
    // "TypeScript" in the registry, "TS" from the user: neither is lower case
    expect(resolveMonacoLanguage("TS", REGISTRY)).toBe("typescript");
    expect(resolveMonacoLanguage("  C#  ", REGISTRY)).toBe("csharp");
    expect(resolveMonacoLanguage("C++", REGISTRY)).toBe("cpp");
    expect(resolveMonacoLanguage("PostgreSQL", REGISTRY)).toBe("pgsql");
  });

  it("applies the local alias table before looking anything up", () => {
    // The pairing that justifies the table: Monaco has no alias for "bash"
    expect(resolveMonacoLanguage("bash", REGISTRY)).toBe("shell");
    expect(resolveMonacoLanguage("zsh", REGISTRY)).toBe("shell");
    expect(resolveMonacoLanguage("md", REGISTRY)).toBe("markdown");
    expect(resolveMonacoLanguage("psql", REGISTRY)).toBe("pgsql");
  });

  it("falls back to plain text for anything unregistered", () => {
    expect(resolveMonacoLanguage("wombat", REGISTRY)).toBe(PLAIN_TEXT_LANGUAGE);
    expect(resolveMonacoLanguage("constructor", REGISTRY)).toBe(
      PLAIN_TEXT_LANGUAGE
    );
    expect(resolveMonacoLanguage("__proto__", REGISTRY)).toBe(
      PLAIN_TEXT_LANGUAGE
    );
  });

  it("falls back to plain text when there is no language at all", () => {
    expect(resolveMonacoLanguage(null, REGISTRY)).toBe(PLAIN_TEXT_LANGUAGE);
    expect(resolveMonacoLanguage("", REGISTRY)).toBe(PLAIN_TEXT_LANGUAGE);
    expect(resolveMonacoLanguage("   ", REGISTRY)).toBe(PLAIN_TEXT_LANGUAGE);
  });

  it("survives registry entries that carry no aliases", () => {
    // `aliases` is optional on Monaco's own type, so an entry without it is not
    // hypothetical — reading `.some` off it unguarded would throw
    const sparse: MonacoLanguageEntry[] = [{ id: "go" }, { id: "rust" }];

    expect(resolveMonacoLanguage("go", sparse)).toBe("go");
    expect(resolveMonacoLanguage("golang", sparse)).toBe("go");
    expect(resolveMonacoLanguage("ts", sparse)).toBe(PLAIN_TEXT_LANGUAGE);
  });

  it("returns plain text against an empty registry rather than guessing", () => {
    expect(resolveMonacoLanguage("typescript", [])).toBe(PLAIN_TEXT_LANGUAGE);
  });
});
