import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { Panel } from "@/components/ui/panel";
import { authOptions } from "@/lib/auth/options";

export default async function SignUpPage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.id) {
    redirect("/app");
  }

  return (
    <main className="grid min-h-screen items-center px-6 py-12 lg:px-10">
      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_460px]">
        <div className="rounded-[3rem] border border-[var(--line)] bg-[rgba(255,250,243,0.74)] p-8">
          <p className="section-heading">Account setup</p>
          <h1 className="mt-5 max-w-xl text-5xl font-medium tracking-[-0.05em] text-[var(--ink)]">
            Create the operating account for durable content planning.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-[var(--ink-soft)]">
            You’ll start with workspace onboarding, reusable presets, structured brief
            intake, and a saved run/results shell built on durable Postgres persistence.
            New credential accounts now verify email before first sign-in.
          </p>
        </div>
        <Panel className="p-8">
          <p className="text-2xl font-medium text-[var(--ink)]">Create account</p>
          <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
            Start with verified email/password auth and add more providers later without
            changing the workspace data model.
          </p>
          <div className="mt-8">
            <SignUpForm />
          </div>
        </Panel>
      </div>
    </main>
  );
}
