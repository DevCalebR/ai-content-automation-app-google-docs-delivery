# API Flow

## Auth

- `app/api/auth/[...nextauth]/route.ts`
- Credentials auth verifies email and bcrypt password hash.
- Sessions are stored in the database via the Prisma adapter.
- Registration writes the user server-side, then redirects to `/sign-in` with a success state. The password is never echoed back in a server action response.

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

## OpenAI boundary

- `lib/ai/client.ts` owns SDK initialization
- `lib/ai/prompts.ts` owns instruction composition
- `lib/ai/safety.ts` owns basic preflight checks
- `lib/ai/generate.ts` owns the Responses API call and schema parsing
- `lib/validations/generation.ts` owns the output contract

## Stored result contract

- `campaignSummary`
- `calendarEntries`
- `sampleCaptions`
- `hashtags`
- `imagePrompts`
