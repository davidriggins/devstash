import { notFound } from "next/navigation";

import { ItemCard } from "@/components/items/ItemCard";
import {
  ITEM_TYPE_BG_CLASSES,
  ITEM_TYPE_ICONS,
  ITEM_TYPE_LABELS,
  ITEM_TYPE_TEXT_CLASSES,
  itemTypeFromSlug,
} from "@/lib/constants/item-types";
import { getItemsByType } from "@/lib/db/items";
import { cn } from "@/lib/utils";

// Reads the signed-in user's items, so it must never be prerendered or cached
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/items/[type]">) {
  const type = itemTypeFromSlug((await params).type);

  return {
    title: type ? `${ITEM_TYPE_LABELS[type]} · DevStash` : "Not found · DevStash",
  };
}

export default async function ItemsByTypePage({
  params,
}: PageProps<"/items/[type]">) {
  const { type: slug } = await params;
  const type = itemTypeFromSlug(slug);

  // An unrecognised slug is a 404, not a fallback to some default type:
  // /items/widgets is not a page, and pretending otherwise would invent one
  if (!type) {
    notFound();
  }

  const items = await getItemsByType(type);
  const Icon = ITEM_TYPE_ICONS[type];
  const label = ITEM_TYPE_LABELS[type];

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-4">
        <span
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-xl",
            ITEM_TYPE_BG_CLASSES[type]
          )}
        >
          <Icon className={cn("size-6", ITEM_TYPE_TEXT_CLASSES[type])} />
        </span>

        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight">{label}</h1>
          <p className="mt-1 text-muted-foreground">
            {items.length} {items.length === 1 ? "item" : "items"}
          </p>
        </div>
      </header>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-foreground/15 p-12 text-center">
          <span
            className={cn(
              "mx-auto flex size-12 items-center justify-center rounded-xl",
              ITEM_TYPE_BG_CLASSES[type]
            )}
          >
            <Icon
              className={cn("size-6 opacity-60", ITEM_TYPE_TEXT_CLASSES[type])}
            />
          </span>

          <p className="mt-4 text-sm font-medium">
            No {label.toLowerCase()} yet
          </p>
          {/* No call to action: there is no way to create an item yet, and a
              button that does nothing is worse than none */}
          <p className="mt-1 text-sm text-muted-foreground">
            {label} you add will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
