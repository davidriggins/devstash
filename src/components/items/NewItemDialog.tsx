"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Plus } from "lucide-react";

import { createItem } from "@/actions/items";
import {
  EMPTY_ITEM_FORM,
  Field,
  ItemFields,
  type ItemFormValues,
} from "@/components/items/ItemFields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import {
  CREATABLE_ITEM_TYPES,
  isCreatableItemType,
  ITEM_TYPE_ICONS,
  ITEM_TYPE_SINGULAR_LABELS,
  ITEM_TYPE_TEXT_CLASSES,
  type ItemTypeName,
} from "@/lib/constants/item-types";
import { cn } from "@/lib/utils";

const DEFAULT_TYPE: ItemTypeName = "snippet";

/**
 * The "New Item" button and the dialog behind it.
 *
 * This component is the client boundary, not `Topbar` — the top bar also
 * renders `EnvironmentBadge`, a server component that reads `DATABASE_URL`, and
 * that has to stay on the server. Same split as `ItemList` around the drawer.
 */
export function NewItemDialog() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ItemTypeName>(DEFAULT_TYPE);
  const [form, setForm] = useState<ItemFormValues>(EMPTY_ITEM_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  function handleOpenChange(next: boolean) {
    // Escape and the backdrop both come through here, and neither should walk
    // away from a request that is still in flight
    if (isSaving) return;

    setOpen(next);

    // Reset on the way out rather than the way in, so the dialog is never
    // briefly showing the last draft as it opens
    if (!next) {
      reset();
    }
  }

  function reset() {
    setType(DEFAULT_TYPE);
    setForm(EMPTY_ITEM_FORM);
    setError(null);
  }

  function updateField(field: keyof ItemFormValues, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleTypeChange(value: unknown) {
    // The select only offers creatable types, so this cannot fail today; it is
    // here because `onValueChange` hands back `any` and the state is narrower
    if (typeof value === "string" && isCreatableItemType(value)) {
      setType(value);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);

    startSaving(async () => {
      // Every field goes, whatever the type — the server decides which columns
      // this type owns. Sending only what was rendered would hand that decision
      // to the client, and a hidden input is not a validated one.
      const created = await createItem({
        type,
        title: form.title,
        description: form.description,
        content: form.content,
        language: form.language,
        url: form.url,
        tags: form.tags.split(","),
      });

      if (!created.success) {
        setError(created.error ?? "Could not create this item. Try again.");
        return;
      }

      // Straight past `handleOpenChange`, which refuses while `isSaving` is
      // still true inside the transition
      setOpen(false);
      reset();

      toast.add({ title: "Item created", type: "success" });

      // The lists behind the dialog are server-rendered, so the new card only
      // appears once the page re-renders
      router.refresh();
    });
  }

  const needsUrl = type === "link";
  const canSave =
    Boolean(form.title.trim()) &&
    (!needsUrl || Boolean(form.url.trim())) &&
    !isSaving;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* `render` rather than a bare Button with an onClick, so the trigger
          gets the dialog's aria wiring and focus comes back to it on close.
          A Button is a native `<button>`, which is what Base UI wants here. */}
      <DialogTrigger render={<Button size="lg" className="rounded-xl" />}>
        <Plus />
        New Item
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader className="border-b border-foreground/10 p-6 pr-14">
            <DialogTitle>New item</DialogTitle>
            <DialogDescription>
              Pick a type, then fill in what it needs.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 p-6">
            <Field htmlFor="new-item-type" label="Type">
              <Select value={type} onValueChange={handleTypeChange}>
                <SelectTrigger
                  id="new-item-type"
                  className="h-9 w-full"
                  disabled={isSaving}
                >
                  <SelectValue>
                    {(value: ItemTypeName) => (
                      <TypeOption type={value ?? DEFAULT_TYPE} />
                    )}
                  </SelectValue>
                </SelectTrigger>

                <SelectContent>
                  {CREATABLE_ITEM_TYPES.map((name) => (
                    <SelectItem key={name} value={name}>
                      <TypeOption type={name} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {/* Keyed by type so switching resets the inputs a previous type
                rendered — otherwise a snippet's content would still be in
                state after switching to a link, invisible and about to be
                discarded by the server anyway */}
            <ItemFields
              key={type}
              values={form}
              type={type}
              disabled={isSaving}
              onChange={updateField}
              urlRequired={needsUrl}
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-foreground/10 p-6">
            {/* Inline rather than a toast: a refusal has to stay on screen next
                to the field it is about, which is how every other form in this
                project reports one */}
            {error && (
              <p role="alert" className="mr-auto text-sm text-destructive">
                {error}
              </p>
            )}

            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={!canSave}>
              {isSaving ? "Creating…" : "Create item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** One row of the type picker, and the trigger's own label */
function TypeOption({ type }: { type: ItemTypeName }) {
  const Icon = ITEM_TYPE_ICONS[type];

  return (
    <span className="flex items-center gap-2">
      <Icon className={cn("size-4", ITEM_TYPE_TEXT_CLASSES[type])} />
      {ITEM_TYPE_SINGULAR_LABELS[type]}
    </span>
  );
}
