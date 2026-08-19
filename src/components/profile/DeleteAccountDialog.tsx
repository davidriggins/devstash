"use client";

import { useActionState, useState } from "react";

import { deleteAccount } from "@/actions/account";
import type { DeleteAccountState } from "@/actions/account";
import { AuthError } from "@/components/auth/AuthError";
import { SubmitButton } from "@/components/auth/SubmitButton";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Deleting the account, behind a dialog that asks for the account's email to be
 * typed out. A second button to click is too easy to click twice; typing the
 * address is a deliberate act, which is what an irreversible deletion deserves.
 *
 * The action re-checks what was typed, since this field reaches the server from
 * the client like any other.
 */

interface DeleteAccountDialogProps {
  email: string;
}

const EMPTY_STATE: DeleteAccountState = {};

export function DeleteAccountDialog({ email }: DeleteAccountDialogProps) {
  const [state, formAction] = useActionState(deleteAccount, EMPTY_STATE);
  const [confirmation, setConfirmation] = useState("");

  // Compared the way the action compares it, so the button never enables on
  // something the server would then reject
  const matches = confirmation.trim().toLowerCase() === email.toLowerCase();

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={<Button variant="destructive" className="h-10 rounded-xl" />}
      >
        Delete account
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete your account?</AlertDialogTitle>
          <AlertDialogDescription>
            This deletes your account along with every item and collection in
            it. It cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmation">
              Type <span className="font-medium text-foreground">{email}</span>{" "}
              to confirm
            </Label>
            <Input
              id="confirmation"
              name="confirmation"
              autoComplete="off"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className="h-10 rounded-xl"
            />
          </div>

          <AuthError message={state.error} />

          <AlertDialogFooter>
            <AlertDialogCancel
              className="h-10 rounded-xl"
              onClick={() => setConfirmation("")}
            >
              Cancel
            </AlertDialogCancel>

            <SubmitButton
              variant="destructive"
              disabled={!matches}
              className="h-10 rounded-xl"
            >
              Delete account
            </SubmitButton>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
