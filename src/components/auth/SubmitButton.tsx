"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

/**
 * Submit button that disables itself while its form is in flight. Reads the
 * status from context, so it has to live inside the `<form>` it submits.
 */
export function SubmitButton({
  children,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} {...props}>
      {children}
    </Button>
  );
}
