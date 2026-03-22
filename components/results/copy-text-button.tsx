"use client";

import { useTransition } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CopyTextButton({
  text,
  label,
  variant = "secondary",
  size = "sm",
}: {
  text: string;
  label: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "default" | "sm" | "lg";
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      aria-label={label}
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          try {
            await navigator.clipboard.writeText(text);
            toast.success(label);
          } catch {
            toast.error("Clipboard access was blocked. Copy manually instead.");
          }
        });
      }}
      size={size}
      type="button"
      variant={variant}
    >
      {pending ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
      {pending ? "Copied" : "Copy"}
    </Button>
  );
}
