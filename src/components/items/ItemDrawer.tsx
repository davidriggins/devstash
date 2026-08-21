"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import { Copy, Pencil, Pin, Star, X } from "lucide-react";

import { updateItem } from "@/actions/items";
import { CodeEditor } from "@/components/items/CodeEditor";
import { DeleteItemDialog } from "@/components/items/DeleteItemDialog";
import { ItemFields, type ItemFormValues } from "@/components/items/ItemFields";
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
  usesCodeEditor,
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

function formFromDetail(detail: ItemDetail): ItemFormValues {
  return {
    title: detail.title,
    description: detail.description ?? "",
    content: detail.content ?? "",
    language: detail.language ?? "",
    url: detail.url ?? "",
    tags: detail.tags.join(", "),
  };
}

/**
 * The item detail view, and its edit mode. There is no item page â€” this drawer
 * is it.
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
  const router = useRouter();

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

  /**
   * *Which* item is being edited, rather than a boolean. Same trick as `result`
   * above, and it does the resetting for free: opening a different card or
   * closing the drawer changes `itemId`, and edit mode simply stops matching.
   * No effect, and no way to reopen into a half-finished form.
   */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ItemFormValues | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

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

  const isEditing = editingId !== null && editingId === itemId && form !== null;

  /**
   * Prefer the fetched record over the card once it has arrived.
   *
   * Not a detail: after a save, `item` is still the card the page rendered
   * before the edit â€” it is client state in `ItemList`, so `router.refresh()`
   * does not reach it. Reading the title from `item` would show the old one
   * back and make a successful save look like it did nothing.
   */
  const title = detail?.title ?? item?.title ?? "";
  const description = detail ? detail.description : (item?.description ?? null);
  const tags = detail ? detail.tags : (item?.tags ?? []);

  async function handleCopy() {
    // Falls back to the title only when there is genuinely nothing else â€” a
    // link's URL and a file's name are the useful thing to put on the clipboard
    const text = detail?.content ?? detail?.url ?? detail?.fileName ?? title;

    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      toast.add({ title: "Copied to clipboard", type: "success" });
    } catch {
      toast.add({ title: "Could not copy to clipboard", type: "error" });
    }
  }

  function startEditing() {
    if (!detail) return;

    // Seeded at the click rather than in an effect: the values exist already,
    // and there is exactly one moment the form should be reset to them
    setForm(formFromDetail(detail));
    setSaveError(null);
    setEditingId(detail.id);
  }

  function cancelEditing() {
    setEditingId(null);
    setForm(null);
    setSaveError(null);
  }

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form || !editingId) return;

    startSaving(async () => {
      // Every field goes, including the ones this type does not render. The
      // server decides which columns a snippet or a link is allowed to write;
      // sending only what was shown would make that the client's call.
      const saved = await updateItem(editingId, {
        title: form.title,
        description: form.description,
        content: form.content,
        language: form.language,
        url: form.url,
        tags: form.tags.split(","),
      });

      if (!saved.success || !saved.data) {
        setSaveError(saved.error ?? "Could not save this item. Try again.");
        return;
      }

      // Straight into the fetch state: the action returns the whole record, so
      // there is nothing left to go and ask for
      setResult({ id: editingId, detail: saved.data, error: null });
      setEditingId(null);
      setForm(null);
      setSaveError(null);

      toast.add({ title: "Changes saved", type: "success" });

      // The cards behind the drawer are server-rendered, so they only catch up
      // when the page re-renders
      router.refresh();
    });
  }

  /**
   * Runs after the row is gone, in this order: close the drawer, say so, then
   * refresh. The toast outlives the close because `Toaster` sits at the root,
   * and the refresh is what removes the card the drawer was opened from.
   *
   * `result` still holds the deleted record afterwards, and `selected` in
   * `ItemList` still points at it â€” both harmless. The panel is closing, and
   * once the refresh lands there is no card left to reopen it from.
   */
  function handleDeleted() {
    onOpenChange(false);
    toast.add({ title: "Item deleted", type: "success" });
    router.refresh();
  }

  function updateField(field: keyof ItemFormValues, value: string) {
    setForm((current) => (current ? { ...current, [field]: value } : current));
  }

  const type = detail?.type ?? item?.type ?? "note";
  const Icon = ITEM_TYPE_ICONS[type];
  const canSave = Boolean(form?.title.trim()) && !isSaving;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* Both width overrides have to carry `data-[side=right]:` to match the
          specificity of SheetContent's own `data-[side=right]:w-3/4` and
          `data-[side=right]:sm:max-w-sm` â€” plain utilities lose to the
          attribute selector and the panel stays 384px wide, narrow enough that
          a line of code barely fits. Full width on a phone rather than the
          stock three quarters: this is the whole item, not a peek at it. */}
      <SheetContent className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-2xl">
        {item && (
          // One form spanning header and body, because Save sits in the action
          // bar at the top while the inputs are in the scrolling area below
          <form
            onSubmit={handleSave}
            className="flex min-h-0 flex-1 flex-col"
            noValidate
          >
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
                    {isEditing ? "Edit item" : title}
                  </SheetTitle>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {/* The type is fixed for the life of the item, so it stays
                        a badge in edit mode rather than becoming a select */}
                    <Badge variant="secondary">{ITEM_TYPE_LABELS[type]}</Badge>
                    {detail?.language && !isEditing && (
                      <Badge variant="outline">{detail.language}</Badge>
                    )}
                  </div>
                </div>
              </div>

              {isEditing ? (
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={cancelEditing}
                    disabled={isSaving}
                  >
                    <X className="size-4" />
                    Cancel
                  </Button>

                  <Button type="submit" size="sm" disabled={!canSave}>
                    {isSaving ? "Savingâ€¦" : "Save"}
                  </Button>

                  {/* Inline rather than a toast: a validation message has to
                      stay on screen next to the field it is about, and this is
                      how every other form in the project reports a refusal */}
                  {saveError && (
                    <p
                      role="alert"
                      className="w-full text-sm text-destructive"
                    >
                      {saveError}
                    </p>
                  )}
                </div>
              ) : (
                /* Favorite, pin and delete each need a mutation of their own,
                   and those belong to the CRUD feature. Disabled rather than
                   silently inert: a button that looks live and does nothing is
                   the worse lie. */
                <div className="mt-5 flex flex-wrap items-center gap-1">
                  <Button
                    type="button"
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
                    type="button"
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

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                  >
                    <Copy className="size-4" />
                    Copy
                  </Button>

                  <div className="ml-auto flex items-center gap-1">
                    {/* Nothing to edit until the record arrives: content,
                        language and the URL only exist in the fetched detail,
                        so a form opened before it lands would start blank and
                        save those fields away */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={startEditing}
                      disabled={!detail}
                      title={
                        detail ? undefined : "Still loading this item"
                      }
                    >
                      <Pencil className="size-4" />
                      Edit
                    </Button>

                    {/* Unlike Edit, this needs nothing the fetch is waiting
                        for â€” the id and the title both came in on the card, so
                        it stays usable while the body is still a skeleton */}
                    <DeleteItemDialog
                      itemId={item.id}
                      title={title}
                      onDeleted={handleDeleted}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              {isEditing && form ? (
                <ItemFields
                  values={form}
                  type={type}
                  disabled={isSaving}
                  onChange={updateField}
                  autoFocus
                />
              ) : error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : (
                <>
                  {description && (
                    <section>
                      <SectionLabel>Description</SectionLabel>
                      <SheetDescription className="text-foreground">
                        {description}
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

                  {tags.length > 0 && (
                    <section>
                      <SectionLabel>Tags</SectionLabel>
                      <div className="flex flex-wrap gap-1.5">
                        {tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}

              {/* Below the fold in both modes: collections and the dates are
                  display-only, so edit mode shows them rather than hiding
                  context the person is editing against */}
              {!error && (
                <>
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
                        value={fullDateFormatter.format(
                          detail?.createdAt ?? item.createdAt
                        )}
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
          </form>
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
    // Code reads in the editor, prose reads as prose: a note or a prompt in a
    // gutter-and-line-numbers window would be pointlessly hostile
    if (usesCodeEditor(detail.type)) {
      return (
        <CodeEditor
          value={detail.content}
          language={detail.language}
          readOnly
          ariaLabel={`Content of ${detail.title}`}
        />
      );
    }

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
            Â· {formatFileSize(detail.fileSize)}
          </span>
        )}
      </p>
    );
  }

  return <p className="text-sm text-muted-foreground">No content</p>;
}
