import { getCurrentUserId } from "@/lib/db/user";
import { isItemTypeName } from "@/lib/constants/item-types";
import { prisma } from "@/lib/prisma";
import type { DashboardItem } from "@/types/dashboard";

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
