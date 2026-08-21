import { getCurrentUserId } from "@/lib/db/user";
import {
  ITEM_TYPE_NAMES,
  hasEditableField,
  isItemTypeName,
  type ItemTypeName,
} from "@/lib/constants/item-types";
import { prisma } from "@/lib/prisma";
import type { UpdateItemInput } from "@/lib/validation/items";
import type {
  DashboardItem,
  ItemDetail,
  SidebarItemType,
} from "@/types/dashboard";

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

const ITEM_DETAIL_SELECT = {
  ...ITEM_SELECT,
  content: true,
  url: true,
  fileUrl: true,
  fileName: true,
  fileSize: true,
  language: true,
  updatedAt: true,
  // Sorted for the same reason the tags are: stable badge order between renders
  collections: {
    select: { collection: { select: { id: true, name: true } } },
    orderBy: { collection: { name: "asc" } },
  },
} as const;

interface ItemDetailRecord extends ItemRecord {
  content: string | null;
  url: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  language: string | null;
  updatedAt: Date;
  collections: { collection: { id: string; name: string } }[];
}

function toItemDetail({
  itemType,
  tags,
  collections,
  ...item
}: ItemDetailRecord): ItemDetail {
  return {
    ...item,
    // Same fallback as the cards: custom types are not built yet
    type: isItemTypeName(itemType.name) ? itemType.name : "note",
    tags: tags.map((tag) => tag.name),
    collections: collections.map(({ collection }) => collection),
  };
}

/**
 * One item in full, or null when it does not exist, is not this user's, or
 * nobody is signed in.
 *
 * The ownership check is part of the `where` rather than a test on the result:
 * another user's item is simply not found, so there is no branch that could
 * return it and no way for the caller to tell the two cases apart. That is the
 * point — a "forbidden" answer would confirm the id exists.
 */
export async function getItemById(id: string): Promise<ItemDetail | null> {
  const userId = await getCurrentUserId();

  if (!userId) {
    return null;
  }

  const item: ItemDetailRecord | null = await prisma.item.findFirst({
    where: { id, userId },
    select: ITEM_DETAIL_SELECT,
  });

  return item ? toItemDetail(item) : null;
}

/**
 * Writes one item's editable fields and returns it in full, or null when it
 * does not exist, is not this user's, or nobody is signed in — the same three
 * cases `getItemById` collapses, and collapsed here for the same reason.
 *
 * Ownership is in the `where` of both statements, not checked once and trusted
 * afterwards. The read is needed anyway: which of `content`, `language` and
 * `url` may be written is the *item type's* decision, and the type is a column,
 * not something the caller can be allowed to assert.
 */
export async function updateItem(
  id: string,
  data: UpdateItemInput
): Promise<ItemDetail | null> {
  const userId = await getCurrentUserId();

  if (!userId) {
    return null;
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.item.findFirst({
      where: { id, userId },
      select: { itemType: { select: { name: true } } },
    });

    if (!existing) {
      return null;
    }

    const type = isItemTypeName(existing.itemType.name)
      ? existing.itemType.name
      : "note";

    const item: ItemDetailRecord = await tx.item.update({
      // Scoped again rather than by `id` alone. Nothing can change ownership
      // between the two statements, but a `where` that reads `{ id }` is one
      // careless refactor away from being the only check that ever ran.
      where: { id, userId },
      data: {
        title: data.title,
        description: data.description,
        // Only the columns this type owns. The form hides the others, which is
        // a courtesy to the user and no protection at all — this is the check.
        ...(hasEditableField(type, "content") && { content: data.content }),
        ...(hasEditableField(type, "language") && { language: data.language }),
        ...(hasEditableField(type, "url") && { url: data.url }),
        tags: {
          // `set: []` runs before `connectOrCreate` in the same nested write,
          // so a tag that survives the edit is disconnected and reconnected
          // rather than deleted. The `Tag` rows themselves are shared and are
          // never removed here — an orphaned tag belongs to a cleanup job.
          set: [],
          connectOrCreate: data.tags.map((name) => ({
            where: { name },
            create: { name },
          })),
        },
      },
      select: ITEM_DETAIL_SELECT,
    });

    return toItemDetail(item);
  });
}

/**
 * Deletes one item, reporting whether a row actually went. `false` covers the
 * same three cases the two functions above collapse: no such item, not this
 * user's, or nobody signed in.
 *
 * `deleteMany` rather than `delete` — `delete` throws `P2025` when the row is
 * missing, so telling "already gone" from "the database fell over" would mean
 * catching a Prisma error code. A count says it plainly. It also takes a plain
 * filter, so ownership sits in the `where` here exactly as it does everywhere
 * else in this file.
 *
 * Nothing else needs deleting: `ItemCollection` cascades from the item, and so
 * does the implicit `_ItemTags` join. The shared `Tag` rows are deliberately
 * left alone — an orphaned tag belongs to a cleanup job, not to this.
 */
export async function deleteItem(id: string): Promise<boolean> {
  const userId = await getCurrentUserId();

  if (!userId) {
    return false;
  }

  const { count } = await prisma.item.deleteMany({ where: { id, userId } });

  return count > 0;
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
