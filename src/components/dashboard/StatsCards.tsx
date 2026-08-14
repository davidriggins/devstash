import { Files, FolderHeart, FolderOpen, Star } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { mockCollections, mockItemTypeCounts, mockItems } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

// Sourced from the per-type counts so this agrees with the sidebar totals
const totalItems = Object.values(mockItemTypeCounts).reduce(
  (total, count) => total + count,
  0
);

const stats = [
  {
    label: "Items",
    value: totalItems,
    icon: Files,
    tint: "bg-snippet/10 text-snippet",
  },
  {
    label: "Collections",
    value: mockCollections.length,
    icon: FolderOpen,
    tint: "bg-link/10 text-link",
  },
  {
    label: "Favorite Items",
    value: mockItems.filter((item) => item.isFavorite).length,
    icon: Star,
    tint: "bg-note/10 text-note",
  },
  {
    label: "Favorite Collections",
    value: mockCollections.filter((collection) => collection.isFavorite).length,
    icon: FolderHeart,
    tint: "bg-prompt/10 text-prompt",
  },
];

export function StatsCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map(({ label, value, icon: Icon, tint }) => (
        <Card key={label}>
          <CardContent className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-xs tracking-wide text-muted-foreground uppercase">
                {label}
              </p>
              <p className="mt-1 text-2xl font-semibold">{value}</p>
            </div>
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl",
                tint
              )}
            >
              <Icon className="size-5" />
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
