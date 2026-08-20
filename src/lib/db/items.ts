import { getCurrentUserId } from "@/lib/db/user";
import {
  ITEM_TYPE_NAMES,
  isItemTypeName,
  type ItemTypeName,
} from "@/lib/constants/item-types";
import { prisma } from "@/lib/prisma";
import type { DashboardItem, SidebarItemType } from "@/types/dashboard";

const ITEM_SELECT = {
  id: true,
  title: true,
  description: true,
  isFavorite: true,
  isPinned: true,
  createdAt: true,
  itemType: { select: { name: true } },
  // Sorted so the badge order stays the same between renders
  tags: { select: { name: true }, orderBy: { name: "asc" } },
} as const;

interface ItemRecord {
  id: string;
  title: string;
  description: string | null;
  isFavorite: boolean;
  isPinned: boolean;
  createdAt: Date;
  itemType: { name: string };
  tags: { name: string }[];
}

function toDashboardItem({
  itemType,
  tags,
  ...item
}: ItemRecord): DashboardItem {
  return {
    ...item,
    // Custom types are not built yet, so anything unrecognised renders as a note
    type: isItemTypeName(itemType.name) ? itemType.name : "note",
    tags: tags.map((tag) => tag.name),
  };
}

/** Every pinned item for the current user, newest first */
export async function getPinnedItems(): Promise<DashboardItem[]> {
  const userId = await getCurrentUserId();

  if (!userId) {
    return [];
  }

  const items = await prisma.item.findMany({
    where: { userId, isPinned: true },
    orderBy: { createdAt: "desc" },
    select: ITEM_SELECT,
  });

  return items.map(toDashboardItem);
}

/** The most recently created items for the current user */
export async function getRecentItems(limit: number): Promise<DashboardItem[]> {
  const userId = await getCurrentUserId();

  if (!userId) {
    return [];
  }

  const items = await prisma.item.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: ITEM_SELECT,
  });

  return items.map(toDashboardItem);
}

/** Every item of one system type for the current user, newest first */
export async function getItemsByType(
  type: ItemTypeName
): Promise<DashboardItem[]> {
  const userId = await getCurrentUserId();

  if (!userId) {
    return [];
  }

  const items = await prisma.item.findMany({
    // `isSystem` is not decoration: type names are unique per (name, userId),
    // so a user could own a custom type also called "snippet", and its items
    // do not belong on the system snippet page
    where: { userId, itemType: { name: type, isSystem: true } },
    orderBy: { createdAt: "desc" },
    select: ITEM_SELECT,
  });

  return items.map(toDashboardItem);
}

/**
 * The system item types in canonical order, each with the current user's item
 * count. Types the UI has no constants for are skipped.
 */
export async function getItemTypeCounts(): Promise<SidebarItemType[]> {
  const userId = await getCurrentUserId();

  const itemTypes = await prisma.itemType.findMany({
    where: { isSystem: true },
    select: { id: true, name: true },
  });

  const countByTypeId = new Map<string, number>();

  if (userId) {
    const counts = await prisma.item.groupBy({
      by: ["itemTypeId"],
      where: { userId },
      _count: { _all: true },
    });

    for (const { itemTypeId, _count } of counts) {
      countByTypeId.set(itemTypeId, _count._all);
    }
  }

  return itemTypes
    .flatMap(({ id, name }) =>
      isItemTypeName(name)
        ? [{ id, name, count: countByTypeId.get(id) ?? 0 }]
        : []
    )
    .sort(
      (a, b) =>
        ITEM_TYPE_NAMES.indexOf(a.name) - ITEM_TYPE_NAMES.indexOf(b.name)
    );
}

export async function getItemStats() {
  const userId = await getCurrentUserId();

  if (!userId) {
    return { total: 0, favorites: 0 };
  }

  const [total, favorites] = await Promise.all([
    prisma.item.count({ where: { userId } }),
    prisma.item.count({ where: { userId, isFavorite: true } }),
  ]);

  return { total, favorites };
}
