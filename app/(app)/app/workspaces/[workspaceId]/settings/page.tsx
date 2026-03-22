import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { WorkspaceSettingsForm } from "@/components/app/workspace-settings-form";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getWorkspaceAuthorizationForUser } from "@/lib/workspaces/service";

type PageProps = {
  params: Promise<{ workspaceId: string }>;
};

export default async function SettingsPage({ params }: PageProps) {
  const session = await requireSession();
  const { workspaceId } = await params;
  const authorization = await getWorkspaceAuthorizationForUser(workspaceId, session.user.id);

  if (!authorization) {
    notFound();
  }

  const workspace = authorization.workspace;

  const integration = await db.integrationConnection.findFirst({
    where: {
      workspaceId: workspace.id,
      provider: "GOOGLE_DOCS",
    },
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <Panel className="p-7">
        <p className="section-heading">Settings</p>
        <h1 className="mt-4 text-4xl font-medium tracking-[-0.04em] text-[var(--ink)]">
          Workspace settings and integration readiness
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--ink-soft)]">
          Owners can manage workspace metadata and future integrations here. Members have
          read-only visibility into the same workspace readiness context.
        </p>
        <div className="mt-6">
          <Badge>{authorization.isOwner ? "OWNER" : authorization.membership.role}</Badge>
        </div>
        <div className="mt-8">
          {authorization.isOwner ? (
            <WorkspaceSettingsForm workspace={workspace} />
          ) : (
            <div className="rounded-[1.75rem] border border-dashed border-[var(--line)] bg-white/60 p-6 text-sm text-[var(--ink-soft)]">
              Only workspace owners can change settings or manage future integrations. You
              can still create briefs, run generations, and review saved outputs.
            </div>
          )}
        </div>
      </Panel>
      <Panel className="p-7">
        <p className="section-heading">Integrations</p>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-lg font-medium text-[var(--ink)]">Google Docs delivery</p>
          <Badge>{integration?.status ?? "NOT_CONNECTED"}</Badge>
        </div>
        <p className="mt-4 text-sm leading-7 text-[var(--ink-soft)]">
          The workspace already has a durable `IntegrationConnection` model with secure token
          fields and metadata support. Phase 2 will layer the actual OAuth handshake and
          document export workflow onto this record.
        </p>
      </Panel>
    </div>
  );
}
