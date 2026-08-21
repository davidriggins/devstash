import { z } from "zod";

/**
 * The rules for editing an item. The drawer's edit form is the only caller
 * today, but it parses input that reached the server from a browser, so this is
 * the source of truth rather than a second opinion on what the form allowed.
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

export const updateItemSchema = z.object({
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
});

/**
 * What the update query receives: every field resolved, nothing optional left.
 * Which of `content`, `language` and `url` actually reach the database is the
 * item type's decision, made at the write against `ITEM_TYPE_EDITABLE_FIELDS`.
 */
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
