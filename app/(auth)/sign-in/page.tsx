import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { SignInFormFields } from "@/components/auth/sign-in-form";
import { Panel } from "@/components/ui/panel";
import { authOptions } from "@/lib/auth/options";

type PageProps = {
  searchParams: Promise<{ registered?: string; verified?: string; reset?: string; email?: string }>;
};

export default async function SignInPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  const { registered, verified, reset, email } = await searchParams;

  if (session?.user?.id) {
    redirect("/app");
  }

  const successMessage =
    verified === "1"
      ? "Email verified. Sign in to continue."
      : reset === "1"
        ? "Password updated. Sign in with your new password."
        : registered === "1"
          ? "If the address can receive access here, check your inbox for a verification link, then sign in."
          : undefined;

  return (
    <main className="grid min-h-screen items-center px-6 py-12 lg:px-10">
      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_460px]">
        <div className="rounded-[3rem] border border-[var(--line)] bg-[rgba(255,250,243,0.74)] p-8">
          <p className="section-heading">Operator login</p>
          <h1 className="mt-5 max-w-xl text-5xl font-medium tracking-[-0.05em] text-[var(--ink)]">
            Re-enter the workspace and keep the content system moving.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-[var(--ink-soft)]">
            Continue from saved briefs, review run history, and generate structured content
            plans without exposing model keys or relying on local demo persistence.
          </p>
          <div className="mt-10 flex flex-wrap gap-3 text-sm text-[var(--ink-soft)]">
            <span className="rounded-full border border-[var(--line)] px-4 py-2">Protected app routes</span>
            <span className="rounded-full border border-[var(--line)] px-4 py-2">JWT session auth</span>
            <span className="rounded-full border border-[var(--line)] px-4 py-2">Workspace-aware onboarding</span>
          </div>
          <Link className="mt-10 inline-block text-sm font-medium text-[var(--ink)]" href="/">
            Back to product overview
          </Link>
        </div>
        <Panel className="p-8">
          <p className="text-2xl font-medium text-[var(--ink)]">Sign in</p>
          <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
            Use your verified email and password to open the workspace.
          </p>
          <div className="mt-8">
            <SignInFormFields
              defaultEmail={email}
              successMessage={successMessage}
            />
          </div>
        </Panel>
      </div>
    </main>
  );
}
