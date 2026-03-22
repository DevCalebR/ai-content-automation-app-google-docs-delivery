import * as React from "react";
import { cn } from "@/lib/utils";

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-2xl border border-[var(--line)] bg-[var(--panel-strong)] px-4 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)]",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
