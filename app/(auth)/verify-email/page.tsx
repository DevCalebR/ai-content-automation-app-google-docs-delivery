import Link from "next/link";
import { verifyEmailAddress } from "@/lib/auth/email-verification";
import { Panel } from "@/components/ui/panel";

type PageProps = {
  searchParams: Promise<{ email?: string; token?: string }>;
};

export default async function VerifyEmailPage({ searchParams }: PageProps) {
  const { email, token } = await searchParams;
  const result = await verifyEmailAddress({
    email,
    token,
  });

  return (
    <main className="grid min-h-screen items-center px-6 py-12 lg:px-10">
      <div className="mx-auto w-full max-w-3xl">
        <Panel className="p-8">
          <p className="section-heading">Email verification</p>
          <h1 className="mt-4 text-4xl font-medium tracking-[-0.04em] text-[var(--ink)]">
            {result.status === "success" ? "Your email is verified." : "Verification didn’t complete."}
          </h1>
          <p
            className={`mt-4 text-base leading-8 ${
              result.status === "success" ? "text-[var(--ink-soft)]" : "text-[var(--danger)]"
            }`}
          >
            {result.message}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={result.status === "success" ? "/sign-in?verified=1" : "/verify-email/resend"}>
              <span className="inline-flex h-11 items-center rounded-full bg-[var(--ink)] px-5 text-sm font-medium text-[var(--surface-strong)]">
                {result.status === "success" ? "Continue to sign in" : "Resend verification"}
              </span>
            </Link>
            <Link href="/sign-in">
              <span className="inline-flex h-11 items-center rounded-full border border-[var(--line)] bg-[var(--panel-strong)] px-5 text-sm font-medium text-[var(--ink)]">
                Back to sign in
              </span>
            </Link>
          </div>
        </Panel>
      </div>
    </main>
  );
}
