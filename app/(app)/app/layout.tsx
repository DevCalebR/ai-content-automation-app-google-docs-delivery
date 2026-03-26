import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { getUserWorkspaces } from "@/lib/data/workspaces";
import { AppSidebar } from "@/components/app/app-sidebar";
import { SignOutButton } from "@/components/app/sign-out-button";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const workspaces = await getUserWorkspaces(session.user.id);

  return (
    <div className="app-shell-grid min-h-screen">
      <AppSidebar workspaces={workspaces} />
      <div className="min-w-0">
        <header className="sticky top-0 z-10 border-b border-[var(--line)] bg-[rgba(245,240,232,0.8)] px-6 py-4 backdrop-blur lg:px-10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[var(--ink)]">Signed in as {session.user.email}</p>
              <p className="text-xs text-[var(--ink-soft)]">
                Saved workspaces, recent runs, and ready-to-share content plans.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link className="text-sm text-[var(--ink-soft)] hover:text-[var(--ink)]" href="/">
                Marketing site
              </Link>
              <SignOutButton />
            </div>
          </div>
        </header>
        <div className="px-6 py-8 lg:px-10">{children}</div>
      </div>
    </div>
  );
}
