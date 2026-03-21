"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Workspace } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type WorkspaceItem = Workspace & {
  _count: {
    briefs: number;
    generationRuns: number;
  };
};

export function AppSidebar({
  workspaces,
}: {
  workspaces: WorkspaceItem[];
}) {
  const pathname = usePathname();

  const baseLinks = [
    { href: "/app", label: "Dashboard" },
    { href: "/app/onboarding", label: "New workspace" },
  ];

  return (
    <aside className="border-r border-[var(--line)] bg-[var(--panel)]/70 px-5 py-6">
      <div className="space-y-6">
        <div>
          <p className="section-heading">Navigation</p>
          <div className="mt-3 flex flex-col gap-1">
            {baseLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-2xl px-4 py-3 text-sm font-medium transition",
                  pathname === link.href
                    ? "bg-[var(--ink)] text-[var(--surface-strong)]"
                    : "text-[var(--ink-soft)] hover:bg-white/50 hover:text-[var(--ink)]",
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <p className="section-heading">Workspaces</p>
            <Badge>{workspaces.length}</Badge>
          </div>
          <div className="mt-3 space-y-2">
            {workspaces.length ? (
              workspaces.map((workspace) => {
                const href = `/app/workspaces/${workspace.id}`;
                const active = pathname.startsWith(href);

                return (
                  <Link
                    key={workspace.id}
                    href={href}
                    className={cn(
                      "block rounded-[1.5rem] border border-transparent px-4 py-3 transition",
                      active
                        ? "border-[var(--line)] bg-white"
                        : "hover:border-[var(--line)] hover:bg-white/50",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-[var(--ink)]">{workspace.name}</p>
                        <p className="mt-1 text-xs text-[var(--ink-soft)]">
                          {workspace._count.briefs} briefs · {workspace._count.generationRuns} runs
                        </p>
                      </div>
                      <span className="text-xs text-[var(--ink-soft)]">Open</span>
                    </div>
                  </Link>
                );
              })
            ) : (
              <p className="rounded-[1.5rem] border border-dashed border-[var(--line)] px-4 py-5 text-sm text-[var(--ink-soft)]">
                Create your first workspace to unlock briefs, presets, and saved runs.
              </p>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
