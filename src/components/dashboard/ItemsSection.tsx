import type { ComponentType } from "react";

import { ItemRow } from "@/components/dashboard/ItemRow";
import { SectionHeading } from "@/components/dashboard/SectionHeading";
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
          <ItemRow key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
