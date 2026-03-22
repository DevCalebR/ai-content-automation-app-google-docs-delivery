import { cn } from "@/lib/utils";

export function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-[var(--line)] bg-white/70 px-3 py-1 text-xs font-medium text-[var(--ink-soft)]",
        className,
      )}
    >
      {children}
    </span>
  );
}
