# Deployment

## Recommended target

- Vercel for the Next.js application
- Managed PostgreSQL for production
- Server-side environment variables for auth and OpenAI secrets
- Google OAuth client credentials for My Drive delivery
- Optional Google Cloud service account for the legacy shared-folder fallback

## Environment variables

### Required for the core production app

These are the vars the app runtime expects for the core signed-in product experience: auth,
database-backed app data, and OpenAI generation.

```env
DATABASE_URL=
OPENAI_API_KEY=
APP_URL=https://your-app-domain.com
NEXTAUTH_URL=https://your-app-domain.com
NEXTAUTH_SECRET=replace-with-a-long-random-secret
```

Notes:

- `NEXTAUTH_URL` should be set explicitly in production even though the app runtime falls
  back to `APP_URL` when it is omitted.
- `OPENAI_MODEL` is optional because the app defaults to `gpt-5.4-mini`.

### Required for auth email flows

These are only required if production sign-up, verification resend, and forgot-password
should send real email.

```env
EMAIL_FROM=AI Content Automation <no-reply@your-domain.com>
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_SECURE=false
```

Notes:

- If these vars are not configured, production sign-up can still create accounts, but
  verification and password-reset email delivery will fail.
- `SMTP_SECURE` is optional and defaults effectively to `false` when omitted.

### Optional for Google OAuth / My Drive delivery

Only set these if you want the preferred workspace-owner Google OAuth flow for My Drive
folders.

```env
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
```

These must match a Google OAuth client whose callback URL is:

```text
https://your-app-domain.com/api/google-docs/callback
```

### Optional for legacy Google Docs service-account delivery

Only set these if you still want the shared-folder fallback path.

```env
GOOGLE_DOCS_SERVICE_ACCOUNT_EMAIL=
GOOGLE_DOCS_SERVICE_ACCOUNT_PRIVATE_KEY=
```

### Tooling / local-only

These are not required for the core production runtime, but they are useful for local
development, seeding, and some Prisma workflows.

```env
DIRECT_DATABASE_URL=
OPENAI_MODEL=gpt-5.4-mini
NODE_ENV=production
SEED_DEMO_ACCOUNT=false
SEED_DEMO_EMAIL=demo@example.com
SEED_DEMO_PASSWORD=Phase1DemoPass!
```

Notes:

- `DIRECT_DATABASE_URL` is for Prisma commands where the provider requires a direct
  connection. It is not required for the app runtime itself.
- `NODE_ENV` is usually managed by the platform on Vercel.
- `SEED_DEMO_*` is for local/demo seeding only.

## Deployment steps

1. Provision PostgreSQL.
2. Set the core production vars.
3. Run migrations against production:

```bash
npm run db:migrate:deploy
```

4. If public auth email flows are enabled, add the SMTP + `EMAIL_FROM` vars.
5. If My Drive delivery is enabled, add `GOOGLE_OAUTH_CLIENT_ID` and
   `GOOGLE_OAUTH_CLIENT_SECRET`.
6. If the legacy shared-folder fallback is still needed, add the service-account vars.
7. Build and deploy the Next.js application.
8. Verify sign-up, sign-in, workspace creation, brief save, generation, exports, Google
   OAuth connection, and Google Docs delivery for the features you enabled.

## Notes

- Never expose `OPENAI_API_KEY` client-side.
- Keep `NEXTAUTH_SECRET` unique per environment.
- Use `DIRECT_DATABASE_URL` for Prisma migrations where the provider requires a direct
  connection.
- Configure transactional email before enabling production sign-up, verification, and password reset flows.
- The preferred production delivery path is now workspace-owner Google OAuth for My Drive folders.
- The service-account flow remains available as a legacy fallback for shared-folder delivery and Shared Drive use cases.
- Store the Google service account private key as a multiline secret and preserve newlines when your deploy platform requires escaping.
