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

/** Narrows a type name read from the database to one we have UI constants for */
export function isItemTypeName(name: string): name is ItemTypeName {
  return name in ITEM_TYPE_ICONS;
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
