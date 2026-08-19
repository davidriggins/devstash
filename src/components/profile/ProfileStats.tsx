import { Files, FolderOpen } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ITEM_TYPE_BG_CLASSES,
  ITEM_TYPE_ICONS,
  ITEM_TYPE_TEXT_CLASSES,
} from "@/lib/constants/item-types";
import { getCollectionStats } from "@/lib/db/collections";
import { getItemStats, getItemTypeCounts } from "@/lib/db/items";
import { cn } from "@/lib/utils";

/**
 * What the account holds. The per-type breakdown comes from the same
 * `getItemTypeCounts` the sidebar uses — it already returns every system type
 * in canonical order with zeros included, so there is no second query here.
 */
export async function ProfileStats() {
  const [items, collections, typeCounts] = await Promise.all([
    getItemStats(),
    getCollectionStats(),
    getItemTypeCounts(),
  ]);

  const totals = [
    { label: "Items", value: items.total, icon: Files },
    { label: "Collections", value: collections.total, icon: FolderOpen },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {totals.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="flex items-center justify-between gap-4 rounded-xl border border-border p-4"
            >
              <div className="min-w-0">
                <p className="truncate text-xs tracking-wide text-muted-foreground uppercase">
                  {label}
                </p>
                <p className="mt-1 text-2xl font-semibold">{value}</p>
              </div>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <Icon className="size-5" />
              </span>
            </div>
          ))}
        </div>

        <div>
          <h3 className="text-xs tracking-wide text-muted-foreground uppercase">
            Items by type
          </h3>

          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {typeCounts.map(({ id, name, count }) => {
              const Icon = ITEM_TYPE_ICONS[name];

              return (
                <li
                  key={id}
                  className="flex items-center gap-3 rounded-xl border border-border px-3 py-2"
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg",
                      ITEM_TYPE_BG_CLASSES[name],
                      ITEM_TYPE_TEXT_CLASSES[name]
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm capitalize">
                    {name}
                  </span>
                  <span className="text-sm font-medium tabular-nums">
                    {count}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
