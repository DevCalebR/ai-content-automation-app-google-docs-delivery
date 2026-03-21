# Architecture

## Goal

Phase 1 establishes a production-first SaaS foundation for structured content planning and generation. The architecture favors durable persistence, explicit service boundaries, and small modules over route-level business logic.

## High-level layers

1. `app/`
   Next.js App Router UI, layouts, route protection, and server actions.
2. `components/`
   Reusable UI primitives and product-specific forms.
3. `lib/auth/`
   Auth configuration and server-side session helpers.
4. `lib/data/`
   Read-focused query helpers for workspaces, briefs, presets, and runs.
5. `lib/ai/`
   OpenAI client setup, safety checks, prompt composition, and generation orchestration.
6. `lib/validations/`
   Zod contracts for auth, workspaces, briefs, and structured outputs.
7. `prisma/`
   Schema, migrations, and seed entrypoint.

## Tenancy model

- `Workspace` is the tenant boundary.
- All content briefs, runs, outputs, usage events, and integration connections belong to a workspace.
- `WorkspaceMembership` makes ownership explicit now and supports multi-user collaboration later.

## Auth model

- `next-auth` credentials provider
- Prisma adapter
- database session strategy
- protected app layout via server-side session enforcement
- sign-up redirects to sign-in with a success state instead of returning credentials

This keeps auth durable and self-contained without depending on a third-party hosted identity product in Phase 1.

## Generation flow

1. User saves a structured brief.
2. User opens the generate page and starts a run.
3. Server action validates inputs and ownership.
4. A `GenerationRun` record is created with `RUNNING` status.
5. `lib/ai/generate.ts` composes system instructions, preset instructions, and the user brief.
6. OpenAI Responses API returns a schema-backed structured payload.
7. The payload is normalized into `StructuredOutput`.
8. The run is marked `SUCCEEDED` or `FAILED`.
9. Results are rendered from persisted database data, not transient memory.

## Extension points

- Google Docs export attaches naturally to `IntegrationConnection`, `GenerationRun`, and `StructuredOutput`
- richer output families can extend `StructuredOutput.rawOutput` and add typed renderers
- background workers can adopt the existing `GenerationRun.status` lifecycle
- billing and quotas can key off `UsageEvent`
