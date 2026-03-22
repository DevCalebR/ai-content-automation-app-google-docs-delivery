# API Flow

## Auth

- `app/api/auth/[...nextauth]/route.ts`
- Credentials auth verifies email and bcrypt password hash.
- Sessions use JWT strategy with the Prisma adapter.
- Registration writes the user server-side, sends verification email, then redirects to `/sign-in` with a success state. The password is never echoed back in a server action response.
- Password reset requests return generic success copy to avoid leaking account existence.
- Verification and reset tokens are hashed before persistence.
- Database-backed `SecurityEvent` records support auth rate limiting.

## Server actions

Phase 1 uses server actions for core app mutations rather than large API route handlers.

### Workspace creation

- Validates with `workspaceSchema`
- Creates `Workspace` plus owner `WorkspaceMembership`
- Writes a `UsageEvent`

### Brief save

- Validates with `briefFormSchema`
- Creates or updates `ContentBrief`
- Stores a normalized JSON snapshot
- Revalidates workspace and generate views

### Brief duplication

- Verifies workspace access
- Copies the source brief into a new durable record

### Generation run

- Validates with `runRequestSchema`
- Verifies workspace ownership and brief access
- Applies rate-limit-ready check
- Creates `GenerationRun`
- Calls OpenAI via `lib/ai/generate.ts`
- Persists `StructuredOutput`
- Updates run status
- Writes `UsageEvent`

### Google Docs connection

- Validates the workspace folder ID with `googleDocsConnectionFormSchema`
- Restricts writes to workspace owners
- Validates folder access through the Google Drive API
- Upserts a durable `IntegrationConnection` record with workspace delivery metadata

### Google Docs delivery

- Restricts delivery to workspace owners
- Verifies a completed run with a stored `StructuredOutput`
- Reads workspace Google Docs connection metadata
- Upserts `RunDelivery` to `PENDING`
- Creates a real Google Doc from the normalized stored result
- Updates `RunDelivery` to `DELIVERED` or `FAILED`
- Revalidates results and history views

### Run export downloads

- Route handler verifies session and workspace access
- Reads the persisted run and `StructuredOutput`
- Uses `lib/results/format.ts` to build markdown or plain text
- Returns an attachment response with deterministic content
- Writes a `RUN_EXPORT_DOWNLOADED` usage event

### Owner-only workspace settings

- Workspace authorization is resolved centrally in `lib/workspaces/service.ts`
- Owner-only settings mutations reject members even if they have general workspace access

## OpenAI boundary

- `lib/ai/client.ts` owns SDK initialization
- `lib/ai/prompts.ts` owns instruction composition
- `lib/ai/safety.ts` owns basic preflight checks
- `lib/ai/generate.ts` owns the Responses API call and schema parsing
- `lib/validations/generation.ts` owns the output contract
- `lib/results/format.ts` owns deterministic run-to-export formatting
- `lib/google-docs/*` owns workspace delivery configuration and Google Docs creation

## Stored result contract

- `campaignSummary`
- `calendarEntries`
- `captions`
- `hashtags`
- `imagePrompts`
