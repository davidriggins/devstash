import Link from "next/link";
import { Star } from "lucide-react";

import { SectionHeading } from "@/components/dashboard/SectionHeading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ITEM_TYPE_ACCENT_CLASSES,
  ITEM_TYPE_NAMES,
} from "@/lib/constants/item-types";
import { mockCollections } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { DashboardCollection } from "@/types/dashboard";

const COLLECTIONS_LIMIT = 6;

const recentCollections = [...mockCollections]
  .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  .slice(0, COLLECTIONS_LIMIT);

/**
 * Mock collections carry no type relationship, so the stripe is decorative:
 * a stable colour per position rather than a claim about the contents.
 */
function accentClass(index: number) {
  return ITEM_TYPE_ACCENT_CLASSES[
    ITEM_TYPE_NAMES[index % ITEM_TYPE_NAMES.length]
  ];
}

function CollectionCard({
  collection,
  index,
}: {
  collection: DashboardCollection;
  index: number;
}) {
  return (
    <Link href={`/collections/${collection.id}`} className="group/collection">
      <Card
        className={cn(
          "h-full border-l-4 transition-colors group-hover/collection:bg-muted/40",
          accentClass(index)
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
            {collection.itemCount} items
          </p>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {collection.description}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

export function CollectionsSection() {
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {recentCollections.map((collection, index) => (
          <CollectionCard
            key={collection.id}
            collection={collection}
            index={index}
          />
        ))}
      </div>
    </section>
  );
}
