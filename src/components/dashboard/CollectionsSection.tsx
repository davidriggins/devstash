import Link from "next/link";
import { Star } from "lucide-react";

import { SectionHeading } from "@/components/dashboard/SectionHeading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ITEM_TYPE_ACCENT_CLASSES,
  ITEM_TYPE_ICONS,
  ITEM_TYPE_LABELS,
  ITEM_TYPE_TEXT_CLASSES,
} from "@/lib/constants/item-types";
import { getRecentCollections } from "@/lib/db/collections";
import { cn } from "@/lib/utils";
import type { DashboardCollection } from "@/types/dashboard";

const COLLECTIONS_LIMIT = 6;

function CollectionCard({ collection }: { collection: DashboardCollection }) {
  // The stripe reflects the collection's most-used type; empty ones stay neutral
  const accentClass = collection.dominantType
    ? ITEM_TYPE_ACCENT_CLASSES[collection.dominantType]
    : "border-l-border";

  return (
    <Link href={`/collections/${collection.id}`} className="group/collection">
      <Card
        className={cn(
          "h-full border-l-4 transition-colors group-hover/collection:bg-muted/40",
          accentClass
        )}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="min-w-0 truncate">{collection.name}</span>
            {collection.isFavorite && (
              <Star className="size-4 shrink-0 fill-yellow-400 text-yellow-400" />
            )}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {collection.itemCount}{" "}
            {collection.itemCount === 1 ? "item" : "items"}
          </p>
        </CardHeader>
        <CardContent>
          {collection.description && (
            <p className="text-sm text-muted-foreground">
              {collection.description}
            </p>
          )}

          {collection.types.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {collection.types.map((type) => {
                const Icon = ITEM_TYPE_ICONS[type];

                return (
                  <Icon
                    key={type}
                    role="img"
                    aria-label={ITEM_TYPE_LABELS[type]}
                    className={cn("size-4", ITEM_TYPE_TEXT_CLASSES[type])}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export async function CollectionsSection() {
  const collections = await getRecentCollections(COLLECTIONS_LIMIT);

  return (
    <section>
      <SectionHeading
        title="Collections"
        action={
          <Link
            href="/collections"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            View all
          </Link>
        }
      />
      {collections.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No collections yet. Create one to start organising your items.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      )}
    </section>
  );
}
