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
