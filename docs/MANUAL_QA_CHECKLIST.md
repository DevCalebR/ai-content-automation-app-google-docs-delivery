# Manual QA Checklist

## Launch-critical flow

- Sign up creates a new user and redirects to sign-in with a success message.
- New users cannot sign in before verifying email.
- Verification link marks the email as verified and allows sign-in.
- First sign-in lands on onboarding when no workspace exists.
- Onboarding makes the next three steps clear: create workspace, save brief, generate and export.
- Creating a workspace opens the workspace page with the new workspace visible in the sidebar.
- Saving the first brief keeps the values you entered and makes the generate path obvious.
- Generate page makes it clear which brief is selected and what happens after a run completes.
- Successful generation opens the saved content plan page.
- Results page clearly shows copy, DOCX, PDF, advanced exports, Google Docs delivery, and section refinement actions.
- Accepting a section refinement updates the on-screen content and stays reflected after a reload.
- Copy content plan uses the latest saved content.
- DOCX and PDF downloads start successfully and include accepted refinements.
- Google Docs delivery creates a document from the current saved content plan and shows a success link back to the delivered doc.

## Auth and account trust

- Sign up creates a new user and redirects to sign-in with a success message.
- New users cannot sign in before verifying email.
- Verification link marks the email as verified and allows sign-in.
- Resend verification flow returns generic success copy.
- Sign in accepts valid credentials and rejects invalid ones.
- Forgot password returns generic success copy whether or not the account exists.
- Reset password updates the password and invalidates active sessions.
- Sign out returns to the marketing site.
- Visiting `/app` while signed out redirects to `/sign-in`.

## Workspace and brief management

- Workspace appears in the sidebar after creation.
- Dashboard shows workspace counts and recent runs.
- Workspace page loads system presets.
- Creating a structured brief succeeds and persists after reload.
- Editing a saved brief updates the same record.
- Duplicating a brief creates a second record.

## Generation

- Generate page lists saved briefs.
- Starting a run creates a persisted run record.
- Successful generation opens the saved content plan page.
- Failed generation shows a clear error state on the results page.

## Results and history

- History page shows prior runs for the workspace.
- History page shows run status, model, export readiness, and Google Docs delivery state where available.
- Results page renders overview, calendar, captions, hashtags, and image prompts.
- Each results section has a working copy action.
- Copy content plan copies a complete text version of the saved run.
- DOCX and PDF downloads succeed from the results toolbar.
- Markdown and plain-text downloads return deterministic attachments for the saved run.
- Refine with AI is available for campaign summary, captions, hashtags, and image prompts.
- Accepting a refinement updates only the targeted section.
- Reloading the results page still shows persisted data.

## Google Docs delivery and settings

- Workspace settings can be updated by the owner.
- Workspace members see read-only settings state and cannot perform owner-only mutations.
- Owners can connect a Google account from workspace settings when OAuth env vars are configured.
- Owners can save a My Drive folder ID after the Google account is connected.
- Owners can still save a shared Google Drive folder ID for the service-account delivery path.
- Non-owners cannot change Google Docs delivery settings.
- The settings page clearly shows which Google Docs delivery mode is active.
- The settings page shows a readiness checklist and a clear next step when delivery is not ready yet.
- A successful delivery creates a Google Doc and shows the document link back in results and history.
- A failed delivery records a failed state without removing prior saved run data.

## Final validation

- `npm install`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
