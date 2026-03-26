"use client";

import Link from "next/link";
import { FormEvent, useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SignInForm() {
  return <SignInFormFields />;
}

export function SignInFormFields({
  defaultEmail,
  successMessage,
}: {
  defaultEmail?: string;
  successMessage?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    startTransition(async () => {
      setError(null);
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/app",
      });

      if (!result || result.error) {
        setError("We couldn’t sign you in with that email and password.");
        return;
      }

      window.location.href = "/app";
    });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--ink-soft)]" htmlFor="email">
          Work email
        </label>
        <Input
          defaultValue={defaultEmail}
          id="email"
          name="email"
          type="email"
          placeholder="team@company.com"
          required
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--ink-soft)]" htmlFor="password">
          Password
        </label>
        <Input id="password" name="password" type="password" required />
      </div>
      {successMessage ? <p className="text-sm text-[var(--success)]">{successMessage}</p> : null}
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      <Button className="w-full" size="lg" type="submit" disabled={isPending}>
        {isPending ? "Signing in..." : "Sign in"}
      </Button>
      <div className="flex items-center justify-between gap-3 text-sm text-[var(--ink-soft)]">
        <Link className="font-medium text-[var(--ink)]" href={`/forgot-password${defaultEmail ? `?email=${encodeURIComponent(defaultEmail)}` : ""}`}>
          Forgot password?
        </Link>
        <Link className="font-medium text-[var(--ink)]" href={`/verify-email/resend${defaultEmail ? `?email=${encodeURIComponent(defaultEmail)}` : ""}`}>
          Resend verification
        </Link>
      </div>
      <p className="text-sm text-[var(--ink-soft)]">
        New here?{" "}
        <Link className="font-medium text-[var(--ink)]" href="/sign-up">
          Create your account
        </Link>
      </p>
    </form>
  );
}
