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
            Start producing polished monthly content plans from one clear brief.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-[var(--ink-soft)]">
            Create a workspace for each brand or client, save reusable briefs, generate
            finished content plans, then export DOCX or PDF or deliver straight to
            Google Docs. New accounts verify email before first sign-in.
          </p>
        </div>
        <Panel className="p-8">
          <p className="text-2xl font-medium text-[var(--ink)]">Create account</p>
          <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
            Use your work email to get started. After verification, you can create your
            first workspace and begin generating deliverables right away.
          </p>
          <div className="mt-8">
            <SignUpForm />
          </div>
        </Panel>
      </div>
    </main>
  );
}
