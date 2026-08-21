"use server";

import { getCurrentUserId } from "@/lib/db/user";
import {
  createItem as createItemRecord,
  deleteItem as deleteItemRecord,
  updateItem as updateItemRecord,
} from "@/lib/db/items";
import { createItemSchema, updateItemSchema } from "@/lib/validation/items";
import type { ItemDetail } from "@/types/dashboard";

export interface CreateItemResult {
  success: boolean;
  /** The new item in full, in case a caller wants to open it straight away */
  data?: ItemDetail;
  error?: string;
}

export interface UpdateItemResult {
  success: boolean;
  /** The saved item in full, so the drawer can repaint without a second fetch */
  data?: ItemDetail;
  error?: string;
}

export interface DeleteItemResult {
  success: boolean;
  error?: string;
}

/** Shown for a gone item and for one that was never this user's alike */
const MISSING_ITEM_MESSAGE = "This item no longer exists";

/** Covers a failed write and a missing system type row alike */
const CREATE_FAILED_MESSAGE = "Could not create this item. Try again.";

/**
 * Creates one item from the "New Item" dialog.
 *
 * `data: unknown` for the same reason `updateItem` uses it — TypeScript's types
 * stop at the Server Action boundary, and a declared parameter type here would
 * be a guarantee nothing enforces. The parse is what makes the payload safe,
 * and it is also what decides the item's type: the dialog sends every field
 * whatever type is selected, and the write drops the ones that type does not
 * own, so a link cannot smuggle in content.
 */
export async function createItem(data: unknown): Promise<CreateItemResult> {
  const userId = await getCurrentUserId();

  if (!userId) {
    return { success: false, error: "You are not signed in" };
  }

  const parsed = createItemSchema.safeParse(data);

  if (!parsed.success) {
    // The first issue only, matching `updateItem`: the dialog shows one message
    // above its buttons, and a list of every broken rule reads worse than the
    // one thing to fix next.
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Those details are not valid",
    };
  }

  try {
    const item = await createItemRecord(parsed.data);

    if (!item) {
      return { success: false, error: CREATE_FAILED_MESSAGE };
    }

    return { success: true, data: item };
  } catch (error) {
    console.error("Creating item failed:", error);

    return { success: false, error: CREATE_FAILED_MESSAGE };
  }
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
      return { success: false, error: MISSING_ITEM_MESSAGE };
    }

    return { success: true, data: item };
  } catch (error) {
    console.error("Updating item failed:", error);

    return { success: false, error: "Could not save this item. Try again." };
  }
}

/**
 * Deletes one item, permanently. There is no undo.
 *
 * Same shape of guards as `updateItem`, and for the same reasons: the id comes
 * from the browser, so it is checked here and scoped to the signed-in user at
 * the query. Nothing comes back on success — the item is gone, and the caller
 * knows which one it asked about.
 */
export async function deleteItem(itemId: string): Promise<DeleteItemResult> {
  const userId = await getCurrentUserId();

  if (!userId) {
    return { success: false, error: "You are not signed in" };
  }

  if (typeof itemId !== "string" || itemId.trim() === "") {
    return { success: false, error: "Could not delete this item. Try again." };
  }

  try {
    const deleted = await deleteItemRecord(itemId);

    if (!deleted) {
      return { success: false, error: MISSING_ITEM_MESSAGE };
    }

    return { success: true };
  } catch (error) {
    console.error("Deleting item failed:", error);

    return { success: false, error: "Could not delete this item. Try again." };
  }
}
