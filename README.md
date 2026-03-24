# AI Content Automation App with Google Docs Delivery

The app now covers the production SaaS foundation plus the first delivery workflow. A signed-in user can create a workspace, save structured content briefs, reuse presets, launch a real OpenAI-backed generation run, export a saved run as markdown or plain text, and deliver that run to Google Docs through a workspace-managed connection.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS v4
- Prisma + PostgreSQL
- NextAuth credentials auth + Prisma adapter
- Zod validation
- OpenAI official SDK with the Responses API
- Google Docs API via the official `googleapis` SDK

## Why this auth choice

The app uses `next-auth` credentials auth with the Prisma adapter and JWT-backed sessions because it is production-capable, works cleanly with App Router, keeps identity data in the same durable database model as the rest of the product, and avoids the credentials-provider restriction on database session strategy.

The sign-up flow is intentionally secure: after registration, the server redirects the user to `/sign-in` with a success state. The raw password is never returned from the server to the client. Email verification, password reset, and database-backed auth rate limiting are included.

## Current product slice

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
- Saved run history and results workspace with section-level copy actions
- Deterministic run exports as markdown and plain text
- Google Docs delivery through either:
  - workspace-owner Google OAuth for My Drive folders
  - legacy shared-folder delivery through a service account

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
GOOGLE_DOCS_SERVICE_ACCOUNT_EMAIL=
GOOGLE_DOCS_SERVICE_ACCOUNT_PRIVATE_KEY=
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
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
- `/app/workspaces/[workspaceId]/results/[runId]` results workspace, exports, and delivery actions
- `/app/workspaces/[workspaceId]/results/[runId]/download` markdown/plain-text export route
- `/app/workspaces/[workspaceId]/settings` workspace settings and Google Docs delivery configuration

## Generation architecture

The OpenAI integration is deliberately separated into small server modules:

- `lib/ai/client.ts` initializes the official SDK server-side only
- `lib/ai/prompts.ts` separates system instructions, preset instructions, and user brief composition
- `lib/ai/safety.ts` applies pre-generation guardrails
- `lib/ai/generate.ts` calls the Responses API with schema-backed parsing
- `lib/validations/generation.ts` defines the normalized output contract

Each saved run stores:

- campaign summary
- sample calendar entries
- sample captions
- hashtag sets
- image prompts

## Google Docs delivery

The app now supports two workspace delivery modes:

1. Preferred My Drive path:
   - Add `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET` to the server environment.
   - Open `/app/workspaces/[workspaceId]/settings`.
   - Connect a Google account in the My Drive section.
   - Save the target folder ID for that connected account.
   - Completed runs will create a Google Doc directly in that folder.
2. Legacy shared-folder path:
   - Add `GOOGLE_DOCS_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_DOCS_SERVICE_ACCOUNT_PRIVATE_KEY`.
   - Share a Drive folder with the service account.
   - Save that folder ID in the service account section of workspace settings.

Both modes store delivery state in `RunDelivery`. The current active delivery mode is selected when the owner saves a folder in settings.

## Data model summary

- `User` owns auth identity and sessions
- `Workspace` is the tenant boundary for briefs, runs, outputs, and integration state
- `WorkspaceMembership` records ownership and future team expansion
- `Preset` supports system presets and future workspace-scoped presets
- `ContentBrief` stores normalized brief fields plus a JSON snapshot
- `GenerationRun` tracks run status, model, errors, and output linkage
- `StructuredOutput` stores the normalized generated result
- `RunDelivery` stores per-run delivery status, destination metadata, and the external Google Docs link
- `UsageEvent` is the audit-friendly event placeholder
- `IntegrationConnection` stores the active Google Docs delivery mode, OAuth tokens, and folder configuration

## Seed notes

`npm run db:seed` always installs the system presets. If `SEED_DEMO_ACCOUNT=true`, it also creates a demo user, workspace, and starter brief for local review.

## Test stack

Focused hardening tests use Vitest in Node mode. The current suite covers secure sign-up redirects, email verification gating, password reset, DB-backed auth rate limiting, explicit workspace owner creation, owner/member authorization boundaries, membership default roles, workspace access checks, deterministic export formatting, and Google Docs delivery state changes.

## Validation used for the current build

- `npm install`
- `npm run db:migrate:dev -- --name phase3_exports_and_delivery`
- `npm run db:seed`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Next candidates

- background job execution for long generations
- billing and quota enforcement
- richer output families such as carousels and scripts
- OAuth token refresh persistence and reconnect/revoke UX polish
- stronger Google Docs integration coverage against a live Google Workspace test account
- deeper run comparison and approval workflows
