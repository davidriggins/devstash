/** Monaco's id for "do not highlight this" */
export const PLAIN_TEXT_LANGUAGE = "plaintext";

/**
 * Shorthands people type into `Item.language`, mapped to Monaco language ids.
 *
 * Only the ones Monaco does not already know. It carries its own alias table —
 * `ts`, `js`, `py`, `rb`, `sh`, `yml`, `htm`, `ps1` and `c++` all resolve
 * without help, and `resolveLanguage` in `MonacoFrame` consults it — but not
 * `bash`, which is the single most common value in this app's data and which
 * Monaco files under `shell`. Without this table most commands would render
 * unhighlighted.
 *
 * A `Map` rather than a plain object, and that is not a style choice: the key
 * comes straight from user input, and a plain-object lookup walks the prototype
 * chain, so `"constructor"` and `"__proto__"` would answer with something
 * truthy that no `?? fallback` catches. That trap has been caught twice in this
 * codebase already.
 */
const MONACO_LANGUAGE_ALIASES = new Map<string, string>([
  ["tsx", "typescript"],
  ["jsx", "javascript"],
  ["mjs", "javascript"],
  ["cjs", "javascript"],
  ["node", "javascript"],
  ["bash", "shell"],
  ["zsh", "shell"],
  ["console", "shell"],
  ["terminal", "shell"],
  ["env", "shell"],
  ["cmd", "bat"],
  ["pwsh", "powershell"],
  ["cxx", "cpp"],
  ["cs", "csharp"],
  ["golang", "go"],
  ["rs", "rust"],
  ["kt", "kotlin"],
  ["objc", "objective-c"],
  ["md", "markdown"],
  ["psql", "pgsql"],
  ["jsonc", "json"],
  ["toml", "ini"],
  ["conf", "ini"],
  ["docker", "dockerfile"],
  ["text", PLAIN_TEXT_LANGUAGE],
  ["txt", PLAIN_TEXT_LANGUAGE],
  ["plain", PLAIN_TEXT_LANGUAGE],
  ["none", PLAIN_TEXT_LANGUAGE],
]);

/**
 * Maps a stored language to the Monaco id to ask for, or plain text.
 *
 * Anything unaliased passes through lowercased: Monaco knows far more ids than
 * are worth restating here, and gains more with each release. This decides what
 * to *ask* for — the caller checks the answer against Monaco's real registry,
 * so an id that does not exist becomes plain text rather than being trusted.
 */
export function toMonacoLanguage(raw: string | null | undefined): string {
  const key = raw?.trim().toLowerCase();

  if (!key) return PLAIN_TEXT_LANGUAGE;

  return MONACO_LANGUAGE_ALIASES.get(key) ?? key;
}

/**
 * One entry of Monaco's language registry, as `monaco.languages.getLanguages()`
 * returns them. Declared here rather than imported so this module stays free of
 * Monaco itself — nothing in the browser-only package belongs in a Node test.
 */
export interface MonacoLanguageEntry {
  id: string;
  /** Monaco leaves this off for some languages */
  aliases?: readonly string[] | null;
}

/**
 * Decides the language id to hand the editor, given what Monaco has registered.
 *
 * Takes the registry as an argument instead of reading it, so the decision is
 * testable without loading Monaco: the caller does the impure lookup, this does
 * the choosing.
 *
 * Aliases are matched as well as ids, and that is load-bearing rather than
 * thorough — `ts`, `js`, `py`, `rb`, `sh` and `yml` are all aliases rather than
 * ids, so matching on id alone would quietly send every one of them to plain
 * text. It is also why the table above only carries what Monaco does not
 * already know. Anything still unmatched is a typo or an invented language, and
 * becomes plain text rather than being passed on trust.
 */
export function resolveMonacoLanguage(
  raw: string | null | undefined,
  registered: readonly MonacoLanguageEntry[]
): string {
  const requested = toMonacoLanguage(raw);

  if (requested === PLAIN_TEXT_LANGUAGE) return PLAIN_TEXT_LANGUAGE;

  const match = registered.find(
    (entry) =>
      entry.id === requested ||
      entry.aliases?.some((alias) => alias.toLowerCase() === requested)
  );

  // The id, never the alias — an alias is not accepted as a language
  return match?.id ?? PLAIN_TEXT_LANGUAGE;
}
