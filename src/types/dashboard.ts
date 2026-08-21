import type { ItemTypeName } from "@/lib/constants/item-types";

/** An item row's data, shaped by the functions in `lib/db/items.ts` */
export interface DashboardItem {
  id: string;
  title: string;
  description: string | null;
  isFavorite: boolean;
  isPinned: boolean;
  createdAt: Date;
  type: ItemTypeName;
  tags: string[];
}

/** A collection an item belongs to, as the detail drawer lists it */
export interface ItemDetailCollection {
  id: string;
  name: string;
}

/**
 * One item's full record, shaped by `getItemById` for the detail drawer.
 *
 * Deliberately separate from `DashboardItem` rather than widening it: the list
 * queries read every item a user owns, and a `content` column they never render
 * is paid for on every row.
 */
export interface ItemDetail {
  id: string;
  title: string;
  description: string | null;
  /** TEXT types only */
  content: string | null;
  /** URL types only */
  url: string | null;
  /** FILE types only */
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  /** Drives syntax highlighting once the code editor lands */
  language: string | null;
  isFavorite: boolean;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  type: ItemTypeName;
  tags: string[];
  collections: ItemDetailCollection[];
}

/**
 * `ItemDetail` as it survives `JSON.stringify` on the way through the API
 * route — `Date` becomes an ISO string and has to be revived on the client.
 */
export type SerializedItemDetail = Omit<
  ItemDetail,
  "createdAt" | "updatedAt"
> & {
  createdAt: string;
  updatedAt: string;
};

/** The signed-in user as the sidebar shows them, taken from the session */
export interface SidebarUserProfile {
  name: string | null;
  email: string | null;
  image: string | null;
}

/** A sidebar type row's data, shaped by `getItemTypeCounts` */
export interface SidebarItemType {
  id: string;
  name: ItemTypeName;
  /** How many items of this type the current user has */
  count: number;
}

/** A sidebar collection row's data, shaped by `getSidebarCollections` */
export interface SidebarCollection {
  id: string;
  name: string;
  isFavorite: boolean;
  itemCount: number;
  /** Most-used type, driving the row's dot; null when the collection is empty */
  dominantType: ItemTypeName | null;
}

/** A collection card's data, shaped by `getRecentCollections` */
export interface DashboardCollection {
  id: string;
  name: string;
  description: string | null;
  isFavorite: boolean;
  itemCount: number;
  /** Distinct types held by the collection, most-used first */
  types: ItemTypeName[];
  /** Most-used type, driving the card accent; null when the collection is empty */
  dominantType: ItemTypeName | null;
}
