import type { ItemTypeName } from "@/lib/constants/item-types";
import { mockItems } from "@/lib/mock-data";

/**
 * Derived from the mock data until items move to the database, so the
 * dashboard components stay in step with whatever the seed data actually holds.
 */
export type DashboardItem = (typeof mockItems)[number];

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
