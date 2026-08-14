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
