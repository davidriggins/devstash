"use client";

import { useState } from "react";

import { ItemCard } from "@/components/items/ItemCard";
import { ItemDrawer } from "@/components/items/ItemDrawer";
import type { DashboardItem } from "@/types/dashboard";

/**
 * A list of items and the one drawer they all open.
 *
 * The client boundary sits here rather than on `ItemCard` so the card stays the
 * dumb, layout-free component both pages share — `className` is still the
 * parent's call, which is what lets the dashboard stack these and the type
 * pages lay them out in a grid.
 */
export function ItemList({
  items,
  className,
}: {
  items: DashboardItem[];
  /** The layout: `space-y-3` on the dashboard, a grid on the type pages */
  className?: string;
}) {
  const [selected, setSelected] = useState<DashboardItem | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className={className}>
        {items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            onSelect={() => {
              setSelected(item);
              setOpen(true);
            }}
          />
        ))}
      </div>

      {/* `selected` is deliberately not cleared on close: the sheet keeps its
          children mounted while it animates out, and blanking them first would
          leave an empty panel sliding away. The next click replaces it. */}
      <ItemDrawer item={selected} open={open} onOpenChange={setOpen} />
    </>
  );
}
