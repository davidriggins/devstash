import {
  Code,
  File,
  Image,
  Link,
  Sparkles,
  StickyNote,
  Terminal,
  type LucideIcon,
} from "lucide-react";

// Type-only, so nothing from the generated client is bundled to the browser.
// Taking the enum from Prisma rather than restating its three strings means the
// table below cannot drift from the column it is written into.
import type { ContentType } from "@/generated/prisma/enums";

export const ITEM_TYPE_ICONS = {
  snippet: Code,
  prompt: Sparkles,
  command: Terminal,
  note: StickyNote,
  file: File,
  image: Image,
  link: Link,
} as const satisfies Record<string, LucideIcon>;

export type ItemTypeName = keyof typeof ITEM_TYPE_ICONS;

export const ITEM_TYPE_NAMES = Object.keys(ITEM_TYPE_ICONS) as ItemTypeName[];

/**
 * Narrows a type name read from the database to one we have UI constants for.
 *
 * `Object.hasOwn` rather than `in`, and for the same reason `itemTypeFromSlug`
 * uses a Map: `in` walks the prototype chain, so a type named `constructor` or
 * `toString` would pass and then index `ITEM_TYPE_ICONS` to something that is
 * not a component. Unreachable while only the seeded system types exist, but
 * this narrows a value read straight from the database.
 */
export function isItemTypeName(name: string): name is ItemTypeName {
  return Object.hasOwn(ITEM_TYPE_ICONS, name);
}

/**
 * The type-specific columns each item type is allowed to carry.
 *
 * `title`, `description` and `tags` are not here — every type has them. This is
 * the table that decides whether a snippet may have a `url` or a link may have
 * `content`, and both the edit form and the write path read it: the form to
 * choose which inputs to render, the update query to choose which columns to
 * touch. A hidden input is not a validated one, so the server cannot take the
 * client's word for which fields were in play.
 *
 * File and image own nothing editable — `fileUrl`, `fileName` and `fileSize`
 * come from an upload, not from typing.
 */
export const ITEM_TYPE_EDITABLE_FIELDS = {
  snippet: ["content", "language"],
  prompt: ["content"],
  command: ["content", "language"],
  note: ["content"],
  file: [],
  image: [],
  link: ["url"],
} as const satisfies Record<ItemTypeName, readonly EditableItemField[]>;

/** The columns `ITEM_TYPE_EDITABLE_FIELDS` hands out */
export type EditableItemField = "content" | "language" | "url";

export function hasEditableField(
  type: ItemTypeName,
  field: EditableItemField
): boolean {
  return (ITEM_TYPE_EDITABLE_FIELDS[type] as readonly EditableItemField[]).includes(
    field
  );
}

/**
 * Which content column is authoritative for each type.
 *
 * `Item.contentType` is a required enum and **the schema does not tie it to the
 * item type row** — nothing at the database level stops a snippet being stored
 * as `URL`. Until this table existed the mapping lived only in a ternary in
 * `prisma/seed.ts`, which is why the seed has no `FILE` rows at all. The write
 * path derives the value from here and never accepts it from the client, since
 * a client that could set it could make the two disagree.
 */
export const ITEM_TYPE_CONTENT_TYPES = {
  snippet: "TEXT",
  prompt: "TEXT",
  command: "TEXT",
  note: "TEXT",
  file: "FILE",
  image: "FILE",
  link: "URL",
} as const satisfies Record<ItemTypeName, ContentType>;

/**
 * The types that can be created by typing, in canonical order.
 *
 * Derived from the table above rather than listed by hand, because the reason
 * file and image are missing is not that they are Pro — it is that a `FILE`
 * item's columns come from an upload, and there is no upload. A future type
 * backed by a file would be excluded for the same reason without anyone
 * remembering to add it here.
 */
export const CREATABLE_ITEM_TYPES = ITEM_TYPE_NAMES.filter(
  (name) => ITEM_TYPE_CONTENT_TYPES[name] !== "FILE"
);

/**
 * Narrows a type name that arrived from a form to one that can be created.
 *
 * Goes through `isItemTypeName` first, so the prototype-chain trap is handled
 * in one place: `"constructor"` never reaches the lookup below.
 */
export function isCreatableItemType(name: string): name is ItemTypeName {
  return isItemTypeName(name) && ITEM_TYPE_CONTENT_TYPES[name] !== "FILE";
}

/** Types only available on the Pro plan */
export const PRO_ITEM_TYPES = ["file", "image"] as const satisfies ItemTypeName[];

export function isProItemType(name: ItemTypeName) {
  return (PRO_ITEM_TYPES as readonly ItemTypeName[]).includes(name);
}

/** Tailwind text colors from the `--color-*` theme vars in globals.css */
export const ITEM_TYPE_TEXT_CLASSES = {
  snippet: "text-snippet",
  prompt: "text-prompt",
  command: "text-command",
  note: "text-note",
  file: "text-file",
  image: "text-image",
  link: "text-link",
} as const satisfies Record<ItemTypeName, string>;

/** Tinted backgrounds for the icon tiles on item rows */
export const ITEM_TYPE_BG_CLASSES = {
  snippet: "bg-snippet/10",
  prompt: "bg-prompt/10",
  command: "bg-command/10",
  note: "bg-note/10",
  file: "bg-file/10",
  image: "bg-image/10",
  link: "bg-link/10",
} as const satisfies Record<ItemTypeName, string>;

/** Solid fills for the small type dots in the sidebar */
export const ITEM_TYPE_DOT_CLASSES = {
  snippet: "bg-snippet",
  prompt: "bg-prompt",
  command: "bg-command",
  note: "bg-note",
  file: "bg-file",
  image: "bg-image",
  link: "bg-link",
} as const satisfies Record<ItemTypeName, string>;

/** Left accent stripe on cards and rows */
export const ITEM_TYPE_ACCENT_CLASSES = {
  snippet: "border-l-snippet",
  prompt: "border-l-prompt",
  command: "border-l-command",
  note: "border-l-note",
  file: "border-l-file",
  image: "border-l-image",
  link: "border-l-link",
} as const satisfies Record<ItemTypeName, string>;

export const ITEM_TYPE_LABELS = {
  snippet: "Snippets",
  prompt: "Prompts",
  command: "Commands",
  note: "Notes",
  file: "Files",
  image: "Images",
  link: "Links",
} as const satisfies Record<ItemTypeName, string>;

/** For naming one item rather than a section of them, as in a type picker */
export const ITEM_TYPE_SINGULAR_LABELS = {
  snippet: "Snippet",
  prompt: "Prompt",
  command: "Command",
  note: "Note",
  file: "File",
  image: "Image",
  link: "Link",
} as const satisfies Record<ItemTypeName, string>;

/** Route segment for each type, e.g. /items/snippets */
export const ITEM_TYPE_SLUGS = {
  snippet: "snippets",
  prompt: "prompts",
  command: "commands",
  note: "notes",
  file: "files",
  image: "images",
  link: "links",
} as const satisfies Record<ItemTypeName, string>;

export function getItemTypeHref(name: ItemTypeName) {
  return `/items/${ITEM_TYPE_SLUGS[name]}`;
}

/**
 * Derived from ITEM_TYPE_SLUGS so the two directions cannot drift apart.
 *
 * A Map rather than a plain object, and that is not a style choice: the slug
 * comes from the URL, and a plain-object lookup walks the prototype chain, so
 * `"constructor"` and `"__proto__"` would answer with something truthy that a
 * `?? null` fallback never catches. A Map has no such inherited keys.
 */
const ITEM_TYPE_NAMES_BY_SLUG = new Map<string, ItemTypeName>(
  ITEM_TYPE_NAMES.map((name) => [ITEM_TYPE_SLUGS[name], name] as const)
);

/** Narrows an untrusted `[type]` route segment to a known type, or null */
export function itemTypeFromSlug(slug: string): ItemTypeName | null {
  return ITEM_TYPE_NAMES_BY_SLUG.get(slug) ?? null;
}
