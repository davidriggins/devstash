"use server";

import { getCurrentUserId } from "@/lib/db/user";
import { updateItem as updateItemRecord } from "@/lib/db/items";
import { updateItemSchema } from "@/lib/validation/items";
import type { ItemDetail } from "@/types/dashboard";

export interface UpdateItemResult {
  success: boolean;
  /** The saved item in full, so the drawer can repaint without a second fetch */
  data?: ItemDetail;
  error?: string;
}

/**
 * Saves the drawer's edit form.
 *
 * Both arguments arrive from the browser, so neither is trusted: the id is
 * checked for shape here and scoped to the signed-in user at the query, and the
 * payload is parsed before anything touches the database. TypeScript's types
 * stop at this boundary — `data: unknown` says so rather than pretending a
 * declared parameter type is a guarantee.
 *
 * Returns the saved `ItemDetail` on success. Server Actions serialize `Date`
 * properly, unlike the JSON route the drawer's initial fetch goes through, so
 * these dates need no reviving on the way back.
 */
export async function updateItem(
  itemId: string,
  data: unknown
): Promise<UpdateItemResult> {
  const userId = await getCurrentUserId();

  if (!userId) {
    return { success: false, error: "You are not signed in" };
  }

  if (typeof itemId !== "string" || itemId.trim() === "") {
    return { success: false, error: "Could not save this item. Try again." };
  }

  const parsed = updateItemSchema.safeParse(data);

  if (!parsed.success) {
    // The first issue rather than all of them: the form shows one message above
    // the buttons, and a list of every rule the payload broke reads worse than
    // the one thing to fix next.
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Those changes are not valid",
    };
  }

  try {
    const item = await updateItemRecord(itemId, parsed.data);

    if (!item) {
      // Missing and not-yours collapse into one answer, matching the detail
      // route. Telling them apart would confirm an id exists to anyone guessing.
      return { success: false, error: "This item no longer exists" };
    }

    return { success: true, data: item };
  } catch (error) {
    console.error("Updating item failed:", error);

    return { success: false, error: "Could not save this item. Try again." };
  }
}
