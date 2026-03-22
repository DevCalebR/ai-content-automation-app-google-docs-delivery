import Link from "next/link";
import { ArrowRight, CheckCircle2, Layers3, Sparkles } from "lucide-react";
import { getServerSession } from "next-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { authOptions } from "@/lib/auth/options";

const highlights = [
  "Structured briefs with reusable presets",
  "Saved generation runs and results workspace",
  "OpenAI Responses API boundary with durable persistence",
];

export default async function MarketingPage() {
  const session = await getServerSession(authOptions);

  return (
    <main className="min-h-screen">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--ink)] text-[var(--surface-strong)]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--ink)]">
              AI Content Automation App with Google Docs Delivery
            </p>
            <p className="text-xs text-[var(--ink-soft)]">Phase 1 production foundation</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href={session ? "/app" : "/sign-in"}>
            <Button variant="ghost">{session ? "Open app" : "Sign in"}</Button>
          </Link>
          <Link href={session ? "/app" : "/sign-up"}>
            <Button>{session ? "Go to dashboard" : "Start building"}</Button>
          </Link>
        </div>
      </header>

      <section className="px-6 pb-12 pt-8 lg:px-10 lg:pb-20">
        <div className="relative overflow-hidden rounded-[3rem] border border-[var(--line)] bg-[linear-gradient(135deg,#fff9f2_0%,#f3e5d6_42%,#ead6c4_100%)] p-8 shadow-[var(--shadow)] lg:p-12">
          <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-[rgba(190,92,58,0.18)] blur-3xl" />
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)] lg:items-end">
            <div className="max-w-3xl">
              <Badge className="bg-white/70">Production architecture first</Badge>
              <h1 className="mt-6 max-w-4xl text-5xl font-medium leading-[1.02] tracking-[-0.05em] text-[var(--ink)] md:text-7xl">
                Turn one disciplined brief into a durable monthly content engine.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--ink-soft)]">
                This foundation is built for signed-in teams who need reusable presets,
                durable brief storage, saved run history, and an OpenAI-ready generation
                workflow that can grow into full Google Docs delivery.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={session ? "/app" : "/sign-up"}>
                  <Button size="lg">
                    {session ? "Open app" : "Create account"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="#foundation">
                  <Button size="lg" variant="secondary">
                    View Phase 1 scope
                  </Button>
                </Link>
              </div>
              <div className="mt-10 grid gap-3 sm:grid-cols-3">
                {highlights.map((highlight) => (
                  <div
                    key={highlight}
                    className="rounded-[1.75rem] border border-white/70 bg-white/65 px-4 py-4 text-sm leading-6 text-[var(--ink-soft)]"
                  >
                    {highlight}
                  </div>
                ))}
              </div>
            </div>

            <Panel className="relative overflow-hidden p-6">
              <div className="rounded-[1.75rem] bg-[var(--ink)] p-5 text-[var(--surface-strong)]">
                <p className="section-heading !text-[rgba(255,250,243,0.65)]">Run output</p>
                <p className="mt-4 text-2xl font-medium">April pipeline acceleration</p>
                <p className="mt-2 text-sm leading-7 text-[rgba(255,250,243,0.75)]">
                  Campaign summary, sample calendar, captions, hashtags, and image prompts
                  with every run saved to durable history.
                </p>
              </div>
              <div className="mt-5 space-y-3">
                {[
                  "Workspace ownership and membership",
                  "Structured brief intake and versioned runs",
                  "Results tabs ready for Docs export expansion",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-[1.5rem] bg-white p-4">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-[var(--success)]" />
                    <p className="text-sm text-[var(--ink-soft)]">{item}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      </section>

      <section id="foundation" className="mx-auto max-w-7xl px-6 pb-20 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-3">
          {[
            {
              icon: Layers3,
              title: "Production data model",
              body: "Users, workspaces, briefs, runs, structured outputs, usage events, and integration placeholders all live in Prisma-backed persistence.",
            },
            {
              icon: Sparkles,
              title: "OpenAI-ready service boundary",
              body: "Prompt composition, safety checks, schema enforcement, and result normalization are isolated server-side and ready for broader output categories.",
            },
            {
              icon: CheckCircle2,
              title: "Real SaaS operating shell",
              body: "Auth, onboarding, dashboard, generation, history, results, and settings work together as one coherent operator workflow.",
            },
          ].map((item) => (
            <Panel key={item.title} className="p-6">
              <item.icon className="h-5 w-5 text-[var(--accent)]" />
              <p className="mt-6 text-xl font-medium text-[var(--ink)]">{item.title}</p>
              <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{item.body}</p>
            </Panel>
          ))}
        </div>
      </section>
    </main>
  );
}
