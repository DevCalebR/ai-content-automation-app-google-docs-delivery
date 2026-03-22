import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { Panel } from "@/components/ui/panel";

type PageProps = {
  searchParams: Promise<{ email?: string }>;
};

export default async function ForgotPasswordPage({ searchParams }: PageProps) {
  const { email } = await searchParams;

  return (
    <main className="grid min-h-screen items-center px-6 py-12 lg:px-10">
      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_460px]">
        <div className="rounded-[3rem] border border-[var(--line)] bg-[rgba(255,250,243,0.74)] p-8">
          <p className="section-heading">Password reset</p>
          <h1 className="mt-5 max-w-xl text-5xl font-medium tracking-[-0.05em] text-[var(--ink)]">
            Request a secure reset link without exposing account existence.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-[var(--ink-soft)]">
            The response stays intentionally generic. If the address matches a verified
            account, a reset email will be delivered.
          </p>
          <Link className="mt-10 inline-block text-sm font-medium text-[var(--ink)]" href="/sign-in">
            Back to sign in
          </Link>
        </div>
        <Panel className="p-8">
          <p className="text-2xl font-medium text-[var(--ink)]">Forgot password</p>
          <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
            Enter your work email to receive a reset link if the account is eligible.
          </p>
          <div className="mt-8">
            <ForgotPasswordForm defaultEmail={email} />
          </div>
        </Panel>
      </div>
    </main>
  );
}
