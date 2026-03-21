# AI Content Automation App with Google Docs Delivery

Phase 1 delivers the production foundation for a SaaS content automation platform. A signed-in user can create a workspace, save structured content briefs, reuse presets, launch a real OpenAI-backed generation run, review saved run history, and open a polished results workspace backed by PostgreSQL persistence.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS v4
- Prisma + PostgreSQL
- NextAuth credentials auth + Prisma adapter
- Zod validation
- OpenAI official SDK with the Responses API

## Why this auth choice

Phase 1 uses `next-auth` credentials auth with Prisma-backed sessions because it is production-capable, works cleanly with App Router, keeps identity data in the same durable database model as the rest of the product, and leaves room for OAuth providers later without forcing a redesign of users, sessions, or workspace ownership.

The sign-up flow is intentionally secure: after registration, the server redirects the user to `/sign-in` with a success state. The raw password is never returned from the server to the client. Phase 2 adds email verification, password reset, and database-backed auth rate limiting.

## What Phase 1 includes

- Landing page and polished SaaS app shell
- Sign up, sign in, sign out, protected routes, and first-run onboarding
- Durable data models for users, workspaces, memberships, presets, content briefs, generation runs, structured outputs, usage events, and integration placeholders
- Seeded system presets:
  - Real Estate
  - Coach / Consultant
  - SaaS / Productized Service
  - E-commerce
  - Local Business
  - Creator Brand
- Structured brief intake with save, edit, and duplicate flows
- Real OpenAI generation path using structured outputs
- Saved run history and results tabs
- Settings shell with integration readiness model for future Google Docs delivery

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` into `.env` and fill in:

```env
DATABASE_URL=
DIRECT_DATABASE_URL=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4-mini
APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=replace-with-a-32-character-secret
EMAIL_FROM=AI Content Automation <no-reply@example.com>
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_SECURE=false
NODE_ENV=development
SEED_DEMO_ACCOUNT=false
SEED_DEMO_EMAIL=demo@example.com
SEED_DEMO_PASSWORD=Phase1DemoPass!
```

3. Generate the Prisma client and run migrations:

```bash
npm run db:generate
npm run db:migrate:dev -- --name init
```

4. Seed the system presets:

```bash
npm run db:seed
```

5. Start the app:

```bash
npm run dev
```

## Useful scripts

```bash
npm run dev
npm run lint
npm run typecheck
npm run test
npm run validate
npm run db:generate
npm run db:migrate
npm run db:migrate:deploy
npm run db:seed
npm run db:studio
npm run build
```

## App routes

- `/` marketing site
- `/sign-in` auth
- `/sign-up` auth
- `/verify-email` email verification landing
- `/verify-email/resend` resend verification flow
- `/forgot-password` password reset request
- `/reset-password` password reset completion
- `/app` dashboard
- `/app/onboarding` workspace creation
- `/app/workspaces/[workspaceId]` structured brief intake + saved briefs
- `/app/workspaces/[workspaceId]/generate` run launch
- `/app/workspaces/[workspaceId]/history` saved run history
- `/app/workspaces/[workspaceId]/results/[runId]` results workspace
- `/app/workspaces/[workspaceId]/settings` settings and integration readiness

## Generation architecture

The OpenAI integration is deliberately separated into small server modules:

- `lib/ai/client.ts` initializes the official SDK server-side only
- `lib/ai/prompts.ts` separates system instructions, preset instructions, and user brief composition
- `lib/ai/safety.ts` applies pre-generation guardrails
- `lib/ai/generate.ts` calls the Responses API with schema-backed parsing
- `lib/validations/generation.ts` defines the normalized Phase 1 output contract

The Phase 1 run stores:

- campaign summary
- sample calendar entries
- sample captions
- hashtag sets
- image prompts

## Data model summary

- `User` owns auth identity and sessions
- `Workspace` is the tenant boundary for briefs, runs, outputs, and integration state
- `WorkspaceMembership` records ownership and future team expansion
- `Preset` supports system presets and future workspace-scoped presets
- `ContentBrief` stores normalized brief fields plus a JSON snapshot
- `GenerationRun` tracks run status, model, errors, and output linkage
- `StructuredOutput` stores the normalized generated result
- `UsageEvent` is the audit-friendly event placeholder
- `IntegrationConnection` is the durable placeholder for Google Docs delivery auth

## Seed notes

`npm run db:seed` always installs the system presets. If `SEED_DEMO_ACCOUNT=true`, it also creates a demo user, workspace, and starter brief for local review.

## Test stack

Focused hardening tests use Vitest in Node mode. The current suite covers secure sign-up redirects, email verification gating, password reset, DB-backed auth rate limiting, explicit workspace owner creation, owner/member authorization boundaries, membership default roles, and workspace access checks.

## Validation used for this Phase 1 build

- `npm install`
- `npm run db:migrate:dev -- --name phase1_foundation`
- `npm run db:seed`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

## Phase 2 candidates

- Google OAuth + Docs export flow
- background job execution for long generations
- billing and quota enforcement
- richer output families such as carousels and scripts
- workspace collaboration beyond owner-only flows
