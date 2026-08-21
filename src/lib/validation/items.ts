import { z } from "zod";

import { isCreatableItemType } from "@/lib/constants/item-types";

/**
 * The rules for writing an item, shared by the create dialog and the drawer's
 * edit form. Both parse input that reached the server from a browser, so this
 * is the source of truth rather than a second opinion on what a form allowed.
 */

export const TITLE_MAX_LENGTH = 200;
export const DESCRIPTION_MAX_LENGTH = 1000;
export const CONTENT_MAX_LENGTH = 100_000;
export const LANGUAGE_MAX_LENGTH = 50;
export const TAG_MAX_LENGTH = 50;
export const MAX_TAGS = 20;

/**
 * A nullable text column. Empty and whitespace-only input lands as `null`
 * rather than `""` — the columns are nullable and the drawer already treats
 * null as "nothing here", so storing an empty string would create a second way
 * to say the same thing that only the empty-check has to remember.
 *
 * Accepts `undefined` too, so a form that never rendered the field (a link has
 * no content input) is the same as one that cleared it.
 */
function optionalText(maxLength: number, label: string) {
  return z
    .string()
    .nullish()
    .transform((value) => value?.trim() ?? "")
    .refine((value) => value.length <= maxLength, {
      message: `${label} must be ${maxLength} characters or fewer`,
    })
    .transform((value) => (value === "" ? null : value));
}

/**
 * Tags are lowercased, not merely trimmed. `Tag.name` is unique **globally**
 * rather than per user, so "React" and "react" would be two rows that no query
 * joins back together, and every user would be typing into the same fragmented
 * table. The seeded tags are already lowercase; this keeps them that way.
 */
const tagsSchema = z
  .array(z.string())
  .max(MAX_TAGS, `Use ${MAX_TAGS} tags or fewer`)
  .nullish()
  .transform((tags) => {
    const seen = new Set<string>();

    for (const tag of tags ?? []) {
      const normalized = tag.trim().toLowerCase();

      if (normalized) {
        seen.add(normalized);
      }
    }

    return [...seen];
  })
  .refine((tags) => tags.every((tag) => tag.length <= TAG_MAX_LENGTH), {
    message: `Each tag must be ${TAG_MAX_LENGTH} characters or fewer`,
  })
  // Checked again after normalizing: the cap above counts what was sent, this
  // counts what survived deduplication, and only the second number is stored
  .refine((tags) => tags.length <= MAX_TAGS, {
    message: `Use ${MAX_TAGS} tags or fewer`,
  });

/**
 * Empty means "no link", anything else has to parse as a URL. Written as a
 * union rather than `z.url().optional()` so that clearing the field is allowed
 * while a half-typed "http" is not.
 */
const optionalUrl = z
  .string()
  .nullish()
  .transform((value) => value?.trim() ?? "")
  .pipe(z.union([z.literal(""), z.url("Enter a valid URL")]))
  .transform((value) => (value === "" ? null : value));

/**
 * The fields every item carries, whatever its type.
 *
 * Spread into both schemas rather than written twice: a rule that lived in one
 * of them would mean an item could be created in a state it could never be
 * edited back into, or the reverse.
 */
const itemFields = {
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(TITLE_MAX_LENGTH, `Title must be ${TITLE_MAX_LENGTH} characters or fewer`),
  description: optionalText(DESCRIPTION_MAX_LENGTH, "Description"),
  content: optionalText(CONTENT_MAX_LENGTH, "Content"),
  language: optionalText(LANGUAGE_MAX_LENGTH, "Language"),
  url: optionalUrl,
  tags: tagsSchema,
} as const;

export const updateItemSchema = z.object(itemFields);

/**
 * What the update query receives: every field resolved, nothing optional left.
 * Which of `content`, `language` and `url` actually reach the database is the
 * item type's decision, made at the write against `ITEM_TYPE_EDITABLE_FIELDS`.
 */
export type UpdateItemInput = z.infer<typeof updateItemSchema>;

/** Shown when the submitted type is unknown, or is one that needs an upload */
export const INVALID_ITEM_TYPE_MESSAGE = "Choose a type for this item";

/**
 * Creating adds one field the edit form has no equivalent for: the type, which
 * is chosen once and then fixed for the life of the item.
 *
 * It is validated through `isCreatableItemType` rather than against the full
 * list of type names — a file or image needs `fileUrl`, `fileName` and
 * `fileSize`, which come from an upload that does not exist yet, so one
 * submitted here would produce a `FILE` row with no file in it.
 */
export const createItemSchema = z
  .object({
    type: z.string().refine(isCreatableItemType, INVALID_ITEM_TYPE_MESSAGE),
    ...itemFields,
  })
  /**
   * A link with no URL is the one type-specific rule worth enforcing here: it
   * is the whole content of the item, and `optionalUrl` allows empty so that
   * the other six types (which never render the field) can leave it blank.
   *
   * Note this is stricter than `updateItemSchema`, which still lets a link's
   * URL be cleared — a known gap recorded when edit mode shipped, left alone
   * rather than widening this feature's footprint.
   */
  .superRefine((data, ctx) => {
    if (data.type === "link" && data.url === null) {
      ctx.addIssue({
        code: "custom",
        path: ["url"],
        message: "A link needs a URL",
      });
    }
  });

/**
 * What the create query receives. Same resolved shape as `UpdateItemInput`
 * plus the type, and again it is the type — not the caller — that decides
 * which of `content`, `language` and `url` are actually written.
 */
export type CreateItemInput = z.infer<typeof createItemSchema>;
