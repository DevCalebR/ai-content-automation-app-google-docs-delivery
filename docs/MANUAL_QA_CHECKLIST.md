# Manual QA Checklist

## Auth

- Sign up creates a new user and redirects to sign-in with a success message.
- Sign in accepts valid credentials and rejects invalid ones.
- Sign out returns to the marketing site.
- Visiting `/app` while signed out redirects to `/sign-in`.

## Onboarding and workspaces

- First signed-in session can create a workspace.
- Workspace appears in the sidebar after creation.
- Dashboard shows workspace counts and recent runs.

## Presets and briefs

- Workspace page loads system presets.
- Creating a structured brief succeeds and persists after reload.
- Editing a saved brief updates the same record.
- Duplicating a brief creates a second record.

## Generation

- Generate page lists saved briefs.
- Starting a run creates a persisted run record.
- Successful generation opens the results workspace.
- Failed generation shows a clear error state on the results page.

## Results and history

- History page shows prior runs for the workspace.
- Results page renders overview, calendar, captions, hashtags, and image prompts.
- Reloading the results page still shows persisted data.

## Settings

- Workspace settings can be updated by the owner.
- Integrations section shows durable Google Docs readiness state without dead action buttons.

## Final validation

- `npm run lint`
- `npm run typecheck`
- `npm run build`
