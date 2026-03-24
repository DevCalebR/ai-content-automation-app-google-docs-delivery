"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";

export function SubmitButton({
  children,
  pendingLabel = "Saving...",
  type = "submit",
  ...props
}: ButtonProps & { pendingLabel?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button {...props} disabled={pending || props.disabled} type={type}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
