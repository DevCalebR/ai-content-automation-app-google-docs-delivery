# Architecture

## Goal

The app uses a production-first SaaS architecture for structured content planning, export, and delivery. The architecture favors durable persistence, explicit service boundaries, and small modules over route-level business logic.

## High-level layers

1. `app/`
   Next.js App Router UI, layouts, route protection, and server actions.
2. `components/`
   Reusable UI primitives and product-specific forms.
3. `lib/auth/`
   Auth configuration and server-side session helpers.
4. `lib/data/`
   Read-focused query helpers for workspaces, briefs, presets, runs, and delivery status.
5. `lib/ai/`
   OpenAI client setup, safety checks, prompt composition, and generation orchestration.
6. `lib/validations/`
   Zod contracts for auth, workspaces, briefs, and structured outputs.
7. `lib/results/`
   Deterministic formatting helpers shared by results rendering, downloads, and Google Docs delivery.
8. `lib/google-docs/`
   Workspace delivery configuration, Google API clients, and Google Docs document creation.
9. `prisma/`
   Schema, migrations, and seed entrypoint.

## Tenancy model

- `Workspace` is the tenant boundary.
- All content briefs, runs, outputs, usage events, integration connections, and delivery records belong to a workspace.
- `WorkspaceMembership` makes ownership explicit now and supports multi-user collaboration later.

## Auth model

- `next-auth` credentials provider
- Prisma adapter
- JWT session strategy
- protected app layout via server-side session enforcement
- sign-up redirects to sign-in with a success state instead of returning credentials
- credentials sign-in requires verified email
- password reset and email verification tokens are stored hashed in the database
- auth abuse protection uses database-backed security events and rate limiting

This keeps auth durable and self-contained without depending on a third-party hosted identity product.

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

## Export and delivery flow

1. A completed `GenerationRun` with `StructuredOutput` is opened in the results workspace.
2. `lib/results/format.ts` parses the stored JSON fields and builds deterministic section copy, markdown, and plain-text exports.
3. The download route uses the same formatter, so exports are generated from normalized persistence rather than UI scraping.
4. Workspace owners can configure a Google Drive folder on the settings page.
5. Google Docs delivery creates or updates a `RunDelivery` record, renders the run into readable section blocks, and writes a real Google Doc into the configured folder.
6. Results and history views read the stored `RunDelivery` record to show delivery state and the external document link.

## Delivery model

- `IntegrationConnection` stores the workspace-level Google Docs destination configuration.
- `RunDelivery` stores per-run delivery status, Google document metadata, and the link back to the external document.
- The current implementation uses a workspace-managed Google service account, which keeps the first real delivery flow production-safe without shipping partial OAuth UX.

## Extension points

- richer output families can extend `StructuredOutput.rawOutput` and add typed renderers
- background workers can adopt the existing `GenerationRun.status` lifecycle
- billing and quotas can key off `UsageEvent`
- SMTP delivery can be swapped for another transactional email provider behind the same email service boundary
