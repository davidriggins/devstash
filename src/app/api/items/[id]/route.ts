import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/db/user";
import { getItemById } from "@/lib/db/items";

/**
 * One item in full, for the detail drawer. A route rather than a Server Action
 * because it only reads, and because it is the endpoint a future mobile or CLI
 * client would call.
 *
 * The id comes from the URL, so it is whatever the sender typed. `getItemById`
 * scopes the query to the signed-in user, and an item belonging to someone else
 * comes back null and is answered with a 404 — a 403 would confirm the id
 * exists, which is exactly what an id-guessing caller is asking about.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/items/[id]">
) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "You are not signed in" },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const item = await getItemById(id);

    if (!item) {
      return NextResponse.json(
        { success: false, error: "Item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("Loading item failed:", error);

    return NextResponse.json(
      { success: false, error: "Could not load this item. Try again." },
      { status: 500 }
    );
  }
}
