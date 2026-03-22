import Link from "next/link";
import { ResendVerificationForm } from "@/components/auth/resend-verification-form";
import { Panel } from "@/components/ui/panel";

type PageProps = {
  searchParams: Promise<{ email?: string }>;
};

export default async function ResendVerificationPage({ searchParams }: PageProps) {
  const { email } = await searchParams;

  return (
    <main className="grid min-h-screen items-center px-6 py-12 lg:px-10">
      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_460px]">
        <div className="rounded-[3rem] border border-[var(--line)] bg-[rgba(255,250,243,0.74)] p-8">
          <p className="section-heading">Verification resend</p>
          <h1 className="mt-5 max-w-xl text-5xl font-medium tracking-[-0.05em] text-[var(--ink)]">
            Send a fresh verification link with rate-limited delivery.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-[var(--ink-soft)]">
            If the address is eligible for verification in this workspace app, a new email
            will be sent without exposing whether the account exists.
          </p>
          <Link className="mt-10 inline-block text-sm font-medium text-[var(--ink)]" href="/sign-in">
            Back to sign in
          </Link>
        </div>
        <Panel className="p-8">
          <p className="text-2xl font-medium text-[var(--ink)]">Resend verification email</p>
          <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
            Enter the work email tied to your credentials account.
          </p>
          <div className="mt-8">
            <ResendVerificationForm defaultEmail={email} />
          </div>
        </Panel>
      </div>
    </main>
  );
}
