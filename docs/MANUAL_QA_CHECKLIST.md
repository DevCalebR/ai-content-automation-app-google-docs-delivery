# Manual QA Checklist

## Auth

- Sign up creates a new user and redirects to sign-in with a success message.
- New users cannot sign in before verifying email.
- Verification link marks the email as verified and allows sign-in.
- Resend verification flow returns generic success copy.
- Sign in accepts valid credentials and rejects invalid ones.
- Forgot password returns generic success copy whether or not the account exists.
- Reset password updates the password and invalidates active sessions.
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
- History page shows run status, model, export readiness, and Google Docs delivery state where available.
- Results page renders overview, calendar, captions, hashtags, and image prompts.
- Each results section has a working copy action.
- Copy all results copies a complete text version of the run.
- Markdown and plain-text downloads return deterministic attachments for the saved run.
- Reloading the results page still shows persisted data.

## Settings

- Workspace settings can be updated by the owner.
- Workspace members see read-only settings state and cannot perform owner-only mutations.
- Owners can save a shared Google Drive folder ID for Google Docs delivery.
- Non-owners cannot change Google Docs delivery settings.
- A successful delivery creates a Google Doc and shows the document link back in results and history.
- A failed delivery records a failed state without removing prior saved run data.

## Final validation

- `npm install`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
