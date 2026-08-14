import { Pin, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  ITEM_TYPE_ACCENT_CLASSES,
  ITEM_TYPE_BG_CLASSES,
  ITEM_TYPE_ICONS,
  ITEM_TYPE_TEXT_CLASSES,
  type ItemTypeName,
} from "@/lib/constants/item-types";
import { mockItemTypes } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { DashboardItem } from "@/types/dashboard";

const typeNameById = new Map(
  mockItemTypes.map((itemType) => [itemType.id, itemType.name as ItemTypeName])
);

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

export function ItemRow({ item }: { item: DashboardItem }) {
  const typeName = typeNameById.get(item.itemTypeId) ?? "note";
  const Icon = ITEM_TYPE_ICONS[typeName];

  return (
    <article
      className={cn(
        "flex items-start gap-4 rounded-xl border-l-4 bg-card p-4 ring-1 ring-foreground/10 transition-colors hover:bg-muted/40",
        ITEM_TYPE_ACCENT_CLASSES[typeName]
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl",
          ITEM_TYPE_BG_CLASSES[typeName]
        )}
      >
        <Icon className={cn("size-5", ITEM_TYPE_TEXT_CLASSES[typeName])} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="min-w-0 truncate text-sm font-medium">{item.title}</h3>
          {item.isPinned && (
            <Pin className="size-3.5 shrink-0 text-muted-foreground" />
          )}
          {item.isFavorite && (
            <Star className="size-3.5 shrink-0 fill-yellow-400 text-yellow-400" />
          )}
        </div>

        <p className="mt-1 truncate text-sm text-muted-foreground">
          {item.description}
        </p>

        {item.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <time
        dateTime={item.createdAt.toISOString()}
        className="shrink-0 text-xs text-muted-foreground"
      >
        {dateFormatter.format(item.createdAt)}
      </time>
    </article>
  );
}
