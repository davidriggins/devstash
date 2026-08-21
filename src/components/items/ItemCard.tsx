import type { ReactNode } from "react";
import { Pin, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  ITEM_TYPE_ACCENT_CLASSES,
  ITEM_TYPE_BG_CLASSES,
  ITEM_TYPE_ICONS,
  ITEM_TYPE_TEXT_CLASSES,
} from "@/lib/constants/item-types";
import { cn } from "@/lib/utils";
import type { DashboardItem } from "@/types/dashboard";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

/**
 * One item, styled entirely from its own type. It sets no width and no layout
 * container of its own, so the parent decides how these sit: the dashboard
 * stacks them, the type pages lay them out in a grid.
 */
export function ItemCard({
  item,
  actions,
  onSelect,
}: {
  item: DashboardItem;
  /** Favorite, pin and delete controls, once those exist */
  actions?: ReactNode;
  /** Opens the detail drawer. Omitted, the card is not interactive. */
  onSelect?: () => void;
}) {
  const typeName = item.type;
  const Icon = ITEM_TYPE_ICONS[typeName];

  return (
    <article
      className={cn(
        "relative flex items-start gap-4 rounded-xl border-l-4 bg-card p-4 ring-1 ring-foreground/10 transition-colors hover:bg-muted/40 focus-within:ring-2 focus-within:ring-ring",
        ITEM_TYPE_ACCENT_CLASSES[typeName]
      )}
    >
      {/* Stretched over the whole card rather than wrapping it: a <button> may
          only contain phrasing content, so the heading, paragraph and badges
          could not live inside one. This also leaves the actions slot free to
          hold its own buttons, which nesting would have made invalid. */}
      {onSelect && (
        <button
          type="button"
          onClick={onSelect}
          className="absolute inset-0 z-0 cursor-pointer rounded-xl outline-none"
        >
          <span className="sr-only">Open {item.title}</span>
        </button>
      )}

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

        {/* Clamped rather than truncated: a grid column is narrow enough that
            one line loses most of the description. Guarded because the column
            is nullable, and an empty <p> would still take its margin. */}
        {item.description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {item.description}
          </p>
        )}

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

      {/* Above the stretched button, so the controls it will hold stay clickable */}
      <div className="relative z-10 flex shrink-0 items-center gap-2">
        {actions}
        <time
          dateTime={item.createdAt.toISOString()}
          className="text-xs text-muted-foreground"
        >
          {dateFormatter.format(item.createdAt)}
        </time>
      </div>
    </article>
  );
}
