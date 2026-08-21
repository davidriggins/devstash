"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Copy, Pencil, Pin, Star, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import {
  ITEM_TYPE_BG_CLASSES,
  ITEM_TYPE_ICONS,
  ITEM_TYPE_LABELS,
  ITEM_TYPE_TEXT_CLASSES,
} from "@/lib/constants/item-types";
import { formatFileSize } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  DashboardItem,
  ItemDetail,
  SerializedItemDetail,
} from "@/types/dashboard";

const fullDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

/** Revives the dates `JSON.stringify` flattened on the way out of the route */
function toItemDetail(raw: SerializedItemDetail): ItemDetail {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
  };
}

/**
 * The item detail view. There is no item page — this drawer is it.
 *
 * `item` is the card data the page already has, so the header, tags and
 * description paint the moment the drawer opens; only the parts that need the
 * round trip (content, collections, language, updated date) wait behind a
 * skeleton. That is what makes it feel immediate rather than like a navigation.
 */
export function ItemDrawer({
  item,
  open,
  onOpenChange,
}: {
  /** The clicked card, kept through the close animation so it can play out */
  item: DashboardItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  /**
   * Carries the id it belongs to, so a result left over from the previously
   * opened item is identifiable rather than briefly rendered as this one's.
   * That also keeps the effect free of a synchronous "clear the old state"
   * setState, which would cascade a second render on every open.
   */
  const [result, setResult] = useState<{
    id: string;
    detail: ItemDetail | null;
    error: string | null;
  } | null>(null);

  const itemId = open ? item?.id : undefined;

  useEffect(() => {
    if (!itemId) return;

    // Two cards clicked in quick succession can resolve out of order, and the
    // loser would overwrite the winner. Aborting the stale request is the fix.
    const controller = new AbortController();

    async function load(id: string) {
      try {
        const response = await fetch(`/api/items/${id}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          const body = await response.json().catch(() => null);

          setResult({
            id,
            detail: null,
            error: body?.error ?? "Could not load this item.",
          });
          return;
        }

        setResult({ id, detail: toItemDetail(await response.json()), error: null });
      } catch (cause) {
        // The abort above lands here; it is not a failure worth reporting
        if (controller.signal.aborted) return;

        console.error("Loading item failed:", cause);
        setResult({ id, detail: null, error: "Could not load this item. Try again." });
      }
    }

    void load(itemId);

    return () => controller.abort();
  }, [itemId]);

  const loaded = result && result.id === itemId ? result : null;
  const detail = loaded?.detail ?? null;
  const error = loaded?.error ?? null;
  const isLoading = loaded === null;

  async function handleCopy() {
    // Falls back to the title only when there is genuinely nothing else — a
    // link's URL and a file's name are the useful thing to put on the clipboard
    const text =
      detail?.content ?? detail?.url ?? detail?.fileName ?? item?.title;

    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      toast.add({ title: "Copied to clipboard", type: "success" });
    } catch {
      toast.add({ title: "Could not copy to clipboard", type: "error" });
    }
  }

  const type = item?.type ?? "note";
  const Icon = ITEM_TYPE_ICONS[type];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* Both width overrides have to carry `data-[side=right]:` to match the
          specificity of SheetContent's own `data-[side=right]:w-3/4` and
          `data-[side=right]:sm:max-w-sm` — plain utilities lose to the
          attribute selector and the panel stays 384px wide, narrow enough that
          a line of code barely fits. Full width on a phone rather than the
          stock three quarters: this is the whole item, not a peek at it. */}
      <SheetContent className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-2xl">
        {item && (
          <>
            <div className="border-b border-foreground/10 p-6 pr-14">
              <div className="flex items-start gap-4">
                <span
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-xl",
                    ITEM_TYPE_BG_CLASSES[type]
                  )}
                >
                  <Icon
                    className={cn("size-5", ITEM_TYPE_TEXT_CLASSES[type])}
                  />
                </span>

                <div className="min-w-0 flex-1">
                  <SheetTitle className="text-lg leading-tight break-words">
                    {item.title}
                  </SheetTitle>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{ITEM_TYPE_LABELS[type]}</Badge>
                    {detail?.language && (
                      <Badge variant="outline">{detail.language}</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Every control but Copy needs a mutation, and mutations belong
                  to the CRUD feature. Disabled rather than silently inert: a
                  button that looks live and does nothing is the worse lie. */}
              <div className="mt-5 flex flex-wrap items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled
                  title="Favorites are coming soon"
                >
                  <Star
                    className={cn(
                      "size-4",
                      item.isFavorite && "fill-yellow-400 text-yellow-400"
                    )}
                  />
                  Favorite
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  disabled
                  title="Pinning is coming soon"
                >
                  <Pin
                    className={cn("size-4", item.isPinned && "text-foreground")}
                  />
                  Pin
                </Button>

                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  <Copy className="size-4" />
                  Copy
                </Button>

                <div className="ml-auto flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled
                    title="Editing is coming soon"
                  >
                    <Pencil className="size-4" />
                    Edit
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled
                    title="Deleting is coming soon"
                    className="text-destructive"
                  >
                    <Trash2 className="size-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : (
                <>
                  {item.description && (
                    <section>
                      <SectionLabel>Description</SectionLabel>
                      <SheetDescription className="text-foreground">
                        {item.description}
                      </SheetDescription>
                    </section>
                  )}

                  <section>
                    <SectionLabel>Content</SectionLabel>
                    {isLoading ? (
                      <div className="space-y-2 rounded-xl border border-foreground/10 p-4">
                        <Skeleton className="h-4 w-4/5" />
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    ) : (
                      <ItemContent detail={detail} />
                    )}
                  </section>

                  {item.tags.length > 0 && (
                    <section>
                      <SectionLabel>Tags</SectionLabel>
                      <div className="flex flex-wrap gap-1.5">
                        {item.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </section>
                  )}

                  <section>
                    <SectionLabel>Collections</SectionLabel>
                    {isLoading ? (
                      <Skeleton className="h-6 w-32" />
                    ) : detail && detail.collections.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {detail.collections.map((collection) => (
                          <Badge key={collection.id} variant="outline">
                            {collection.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Not in any collection
                      </p>
                    )}
                  </section>

                  <section>
                    <SectionLabel>Details</SectionLabel>
                    <dl className="space-y-1.5 text-sm">
                      <DetailRow
                        label="Created"
                        value={fullDateFormatter.format(item.createdAt)}
                      />
                      <DetailRow
                        label="Updated"
                        value={
                          detail ? (
                            fullDateFormatter.format(detail.updatedAt)
                          ) : (
                            <Skeleton className="h-4 w-28" />
                          )
                        }
                      />
                    </dl>
                  </section>
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
      {children}
    </h3>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}

/**
 * Plain preformatted text for now. Syntax highlighting and the file and image
 * previews are their own feature; this renders whichever column the item's
 * content type actually filled.
 */
function ItemContent({ detail }: { detail: ItemDetail | null }) {
  if (!detail) return null;

  if (detail.content) {
    return (
      <pre className="max-h-96 overflow-auto rounded-xl border border-foreground/10 bg-muted/40 p-4 text-xs leading-relaxed">
        <code>{detail.content}</code>
      </pre>
    );
  }

  if (detail.url) {
    return (
      <a
        href={detail.url}
        target="_blank"
        rel="noreferrer noopener"
        className="text-sm break-all text-primary underline-offset-4 hover:underline"
      >
        {detail.url}
      </a>
    );
  }

  if (detail.fileName) {
    return (
      <p className="text-sm">
        {detail.fileName}
        {detail.fileSize !== null && (
          <span className="text-muted-foreground">
            {" "}
            · {formatFileSize(detail.fileSize)}
          </span>
        )}
      </p>
    );
  }

  return <p className="text-sm text-muted-foreground">No content</p>;
}

