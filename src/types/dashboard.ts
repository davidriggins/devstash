import { mockCollections, mockItems } from "@/lib/mock-data";

/**
 * Derived from the mock data until the database lands, so the dashboard
 * components stay in step with whatever the seed data actually holds.
 */
export type DashboardItem = (typeof mockItems)[number];
export type DashboardCollection = (typeof mockCollections)[number];
