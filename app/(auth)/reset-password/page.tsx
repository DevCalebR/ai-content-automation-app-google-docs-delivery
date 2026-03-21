import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Panel } from "@/components/ui/panel";

type PageProps = {
  searchParams: Promise<{ email?: string; token?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const { email, token } = await searchParams;

  return (
    <main className="grid min-h-screen items-center px-6 py-12 lg:px-10">
      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_460px]">
        <div className="rounded-[3rem] border border-[var(--line)] bg-[rgba(255,250,243,0.74)] p-8">
          <p className="section-heading">Reset password</p>
          <h1 className="mt-5 max-w-xl text-5xl font-medium tracking-[-0.05em] text-[var(--ink)]">
            Set a new password with a time-limited reset token.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-[var(--ink-soft)]">
            Reset tokens are hashed in the database, expire automatically, and clear active
            sessions when the password changes.
          </p>
          <Link className="mt-10 inline-block text-sm font-medium text-[var(--ink)]" href="/sign-in">
            Back to sign in
          </Link>
        </div>
        <Panel className="p-8">
          <p className="text-2xl font-medium text-[var(--ink)]">Choose a new password</p>
          <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
            Use a strong password you haven’t used for this account before.
          </p>
          <div className="mt-8">
            {email && token ? (
              <ResetPasswordForm email={email} token={token} />
            ) : (
              <p className="text-sm text-[var(--danger)]">
                This reset link is incomplete. Request a new password reset email.
              </p>
            )}
          </div>
        </Panel>
      </div>
    </main>
  );
}
