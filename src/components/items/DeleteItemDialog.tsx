"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import { deleteItem } from "@/actions/items";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/**
 * The drawer's delete control and the confirmation behind it.
 *
 * One button to click, not a typed confirmation like the account dialog: typing
 * an address out is the right weight for losing an entire account, and far too
 * much for one item. What makes this deliberate enough is that the item is
 * named and the confirm button is destructive.
 *
 * Deleting is permanent — there is no undo anywhere in this flow — so a refusal
 * stays in the dialog rather than closing it and dropping a toast the reader
 * would have five seconds to catch.
 */
export function DeleteItemDialog({
  itemId,
  title,
  onDeleted,
}: {
  itemId: string;
  /** Named in the confirmation, so there is no doubt which item is going */
  title: string;
  /** Runs once the row is actually gone: closes the drawer, toasts, refreshes */
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, startDeleting] = useTransition();

  function handleOpenChange(next: boolean) {
    // Escape and the backdrop both route through here, and neither should be
    // able to walk away from a request that is already in flight
    if (isDeleting) return;

    setOpen(next);
    setError(null);
  }

  function handleConfirm() {
    // Cleared before the retry, or a previous refusal sits on screen alongside
    // "Deleting…" and contradicts it
    setError(null);

    startDeleting(async () => {
      const result = await deleteItem(itemId);

      if (!result.success) {
        setError(result.error ?? "Could not delete this item. Try again.");
        return;
      }

      setOpen(false);
      setError(null);
      onDeleted();
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      {/* `type="button"` because this trigger sits inside the drawer's edit
          form — every other button in that header carries it for the same
          reason. The dialog's own buttons are portalled out of the form, so
          they have no form owner to submit. */}
      <AlertDialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            title="Delete"
            className="text-destructive"
          />
        }
      >
        <Trash2 className="size-4" />
        <span className="sr-only">Delete {title}</span>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this item?</AlertDialogTitle>
          <AlertDialogDescription>
            {/* `break-words` for the same reason `SheetTitle` carries it: a
                title runs to 200 characters and need not contain a space */}
            <span className="font-medium break-words text-foreground">
              {title}
            </span>{" "}
            will be permanently deleted. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>

          <AlertDialogAction
            type="button"
            variant="destructive"
            disabled={isDeleting}
            onClick={handleConfirm}
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
