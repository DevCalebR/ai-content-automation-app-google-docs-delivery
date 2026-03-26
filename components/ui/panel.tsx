import { cn } from "@/lib/utils";

export function Panel({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("glass-panel rounded-[2rem]", className)} {...props}>
      {children}
    </div>
  );
}
