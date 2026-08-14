import { Files, FolderHeart, FolderOpen, Star } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { getCollectionStats } from "@/lib/db/collections";
import { getItemStats } from "@/lib/db/items";
import { cn } from "@/lib/utils";

export async function StatsCards() {
  const [items, collections] = await Promise.all([
    getItemStats(),
    getCollectionStats(),
  ]);

  const stats = [
    {
      label: "Items",
      value: items.total,
      icon: Files,
      tint: "bg-snippet/10 text-snippet",
    },
    {
      label: "Collections",
      value: collections.total,
      icon: FolderOpen,
      tint: "bg-link/10 text-link",
    },
    {
      label: "Favorite Items",
      value: items.favorites,
      icon: Star,
      tint: "bg-note/10 text-note",
    },
    {
      label: "Favorite Collections",
      value: collections.favorites,
      icon: FolderHeart,
      tint: "bg-prompt/10 text-prompt",
    },
  ];

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
