# Production Release Checklist

Use this checklist when promoting the app to production on Vercel.

## Branch / release flow

- [ ] Start from a clean local `main`.
- [ ] Land work on a focused feature, fix, or docs branch first.
- [ ] Keep release commits small and specific. Do not mix unrelated branch noise into the release.
- [ ] Before promoting, run the release validation set:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`
- [ ] Merge or cherry-pick the intended release commits onto `main`.
- [ ] Push `main` to trigger the production deployment flow.
- [ ] If the release includes database changes, run `npm run db:migrate:deploy` against production before smoke testing.

## Production environment checklist

### Required for the core production app

- [ ] `DATABASE_URL`
- [ ] `OPENAI_API_KEY`
- [ ] `APP_URL`
- [ ] `NEXTAUTH_URL`
- [ ] `NEXTAUTH_SECRET`

Notes:

- `OPENAI_MODEL` is optional. The app defaults to `gpt-5.4-mini`.
- `NEXTAUTH_URL` should still be set explicitly in production even though runtime falls
  back to `APP_URL` when it is missing.

### Required for auth email flows

Set these if production sign-up, verification resend, and forgot-password should send
real email:

- [ ] `EMAIL_FROM`
- [ ] `SMTP_HOST`
- [ ] `SMTP_PORT`
- [ ] `SMTP_USER`
- [ ] `SMTP_PASSWORD`
- [ ] `SMTP_SECURE` if your SMTP provider requires it

### Optional by feature

Google OAuth / My Drive delivery:

- [ ] `GOOGLE_OAUTH_CLIENT_ID`
- [ ] `GOOGLE_OAUTH_CLIENT_SECRET`
- [ ] Confirm the Google OAuth callback URL is `https://<app-domain>/api/google-docs/callback`

Legacy Google Docs service-account delivery:

- [ ] `GOOGLE_DOCS_SERVICE_ACCOUNT_EMAIL`
- [ ] `GOOGLE_DOCS_SERVICE_ACCOUNT_PRIVATE_KEY`
- [ ] Confirm the target folder is shared with the service account if this path is in use

Tooling / local-only:

- [ ] `DIRECT_DATABASE_URL` only if your Prisma workflow requires a direct connection
- [ ] `SEED_DEMO_ACCOUNT`, `SEED_DEMO_EMAIL`, and `SEED_DEMO_PASSWORD` only for local/demo seeding

## Prisma / database steps

- [ ] Confirm the release does or does not include a new migration.
- [ ] If it does, verify the migration file is committed.
- [ ] Run `npm run db:migrate:deploy` against the production database.
- [ ] Confirm the database is reachable with the production `DATABASE_URL`.
- [ ] If your provider needs a direct connection for Prisma CLI operations, confirm `DIRECT_DATABASE_URL` is set before running migrations.

## Vercel deployment verification

- [ ] Confirm `main` is the branch being promoted.
- [ ] Confirm the Vercel production deployment is `Ready`.
- [ ] Confirm the Vercel project production URL loads successfully.
- [ ] Confirm the domain configured in `APP_URL` and `NEXTAUTH_URL` resolves to the same deployment you intend to test.
- [ ] If you use both the project production URL and a longer auth-linked alias, verify they are attached to the same deployment before testing email verification or OAuth callbacks.
- [ ] Confirm production env vars are present for the features enabled in this release.

## Manual smoke test

### Auth

- [ ] Open the production app.
- [ ] Sign in with a verified account.
- [ ] Confirm you land in the app shell without redirect loops.
- [ ] Sign out and confirm you return to the public auth flow cleanly.

### Forgot password

- [ ] Open `/forgot-password`.
- [ ] Submit a known account email.
- [ ] Confirm the request returns a success state instead of a 500.
- [ ] Open the reset email link and confirm it stays on the expected production domain.

### Structured plan generation

- [ ] Open a workspace.
- [ ] Start `Generate Structured Plan` from a valid saved brief.
- [ ] Confirm the run reaches the results page instead of redirecting to unauthorized or sign-in.
- [ ] Confirm the generated output sections render and can be copied/exported.

### Google Docs delivery

- [ ] Open workspace settings.
- [ ] If testing My Drive delivery, connect Google OAuth and save a folder ID.
- [ ] If testing the legacy fallback, save a folder ID for the service-account path.
- [ ] Deliver a completed run to Google Docs.
- [ ] Confirm the resulting Google Doc opens successfully from the saved link.

## Common failure points

Auth redirect loop or unauthorized page:

- Check `APP_URL`, `NEXTAUTH_URL`, and `NEXTAUTH_SECRET`.
- Check whether the domain in auth emails points to the current deployment.
- Check whether the user is verified and the database is reachable.

Forgot-password returns 500:

- Check SMTP env vars first.
- Check production logs for Prisma or auth rate-limit errors.
- Check that required auth/security migrations are applied.

Generation fails or never starts:

- Check `OPENAI_API_KEY`.
- Check the configured model name if `OPENAI_MODEL` is overridden.
- Check production logs for database write failures or rate-limit errors.

Google OAuth or callback fails:

- Check `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET`.
- Check the OAuth callback URL in Google Cloud matches the production domain.
- Check that the auth-linked production domain resolves to the deployment you are testing.

Google Docs delivery fails:

- Check which delivery mode is active in workspace settings.
- Check folder permissions first.
- Check service-account sharing if the legacy fallback is being used.
- Check token/connection status if the OAuth path is being used.
