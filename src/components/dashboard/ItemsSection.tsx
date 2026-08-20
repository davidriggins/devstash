import type { ComponentType } from "react";

import { SectionHeading } from "@/components/dashboard/SectionHeading";
import { ItemCard } from "@/components/items/ItemCard";
import type { DashboardItem } from "@/types/dashboard";

export function ItemsSection({
  title,
  icon,
  items,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  items: DashboardItem[];
}) {
  if (items.length === 0) return null;

  return (
    <section>
      <SectionHeading title={title} icon={icon} />
      <div className="space-y-3">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
