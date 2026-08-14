import { getCurrentUserId } from "@/lib/db/user";
import {
  ITEM_TYPE_NAMES,
  isItemTypeName,
  type ItemTypeName,
} from "@/lib/constants/item-types";
import { prisma } from "@/lib/prisma";
import type { DashboardCollection } from "@/types/dashboard";

/**
 * Distinct types held by a collection, most-used first. Ties fall back to the
 * canonical type order so the icon row does not reshuffle between renders.
 */
function rankTypes(typeNames: string[]): ItemTypeName[] {
  const counts = new Map<ItemTypeName, number>();

  for (const name of typeNames) {
    if (isItemTypeName(name)) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort(
      ([aName, aCount], [bName, bCount]) =>
        bCount - aCount ||
        ITEM_TYPE_NAMES.indexOf(aName) - ITEM_TYPE_NAMES.indexOf(bName)
    )
    .map(([name]) => name);
}

/**
 * Most recently updated collections for the current user, with the item count
 * and type breakdown the dashboard cards render.
 */
export async function getRecentCollections(
  limit: number
): Promise<DashboardCollection[]> {
  const userId = await getCurrentUserId();

  if (!userId) {
    return [];
  }

  const collections = await prisma.collection.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: {
      id: true,
      name: true,
      description: true,
      isFavorite: true,
      // Only the type name is needed; the counts are derived from these rows
      items: {
        select: { item: { select: { itemType: { select: { name: true } } } } },
      },
    },
  });

  return collections.map(({ items, ...collection }) => {
    const types = rankTypes(items.map(({ item }) => item.itemType.name));

    return {
      ...collection,
      itemCount: items.length,
      types,
      dominantType: types[0] ?? null,
    };
  });
}
