import type { Metadata } from "next";
import { Clock, Pin } from "lucide-react";

import { CollectionsSection } from "@/components/dashboard/CollectionsSection";
import { ItemsSection } from "@/components/dashboard/ItemsSection";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { getPinnedItems, getRecentItems } from "@/lib/db/items";

export const metadata: Metadata = {
  title: "Dashboard | DevStash",
  description: "Your developer knowledge hub",
};

// The dashboard reads live database state, so it must not be prerendered
export const dynamic = "force-dynamic";

const RECENT_ITEMS_LIMIT = 10;

export default async function DashboardPage() {
  const [pinnedItems, recentItems] = await Promise.all([
    getPinnedItems(),
    getRecentItems(RECENT_ITEMS_LIMIT),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Your developer knowledge hub
        </p>
      </header>

      <StatsCards />

      <CollectionsSection />

      <ItemsSection title="Pinned" icon={Pin} items={pinnedItems} />

      <ItemsSection title="Recent Items" icon={Clock} items={recentItems} />
    </div>
  );
}
