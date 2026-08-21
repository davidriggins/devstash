import type { ComponentType } from "react";

import { SectionHeading } from "@/components/dashboard/SectionHeading";
import { ItemList } from "@/components/items/ItemList";
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
      <ItemList items={items} className="space-y-3" />
    </section>
  );
}
