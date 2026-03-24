# Deployment

## Recommended target

- Vercel for the Next.js application
- Managed PostgreSQL for production
- Server-side environment variables for auth and OpenAI secrets
- Google OAuth client credentials for My Drive delivery
- Optional Google Cloud service account for the legacy shared-folder fallback

## Required environment variables

```env
DATABASE_URL=
DIRECT_DATABASE_URL=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4-mini
APP_URL=https://your-app-domain.com
NEXTAUTH_URL=https://your-app-domain.com
NEXTAUTH_SECRET=replace-with-a-long-random-secret
EMAIL_FROM=AI Content Automation <no-reply@your-domain.com>
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_SECURE=false
GOOGLE_DOCS_SERVICE_ACCOUNT_EMAIL=
GOOGLE_DOCS_SERVICE_ACCOUNT_PRIVATE_KEY=
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
NODE_ENV=production
```

## Deployment steps

1. Provision PostgreSQL.
2. Set all production environment variables.
3. Run migrations against production:

```bash
npm run db:migrate:deploy
```

4. Build and deploy the Next.js application.
5. For My Drive delivery, configure a Google OAuth client with the callback URL:

```text
https://your-app-domain.com/api/google-docs/callback
```

6. Add `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET`.
7. Optionally add the service-account env vars if you still need the shared-folder fallback path.
8. Verify sign-up, sign-in, workspace creation, brief save, generation, exports, Google OAuth connection, and Google Docs delivery.

## Notes

- Never expose `OPENAI_API_KEY` client-side.
- Keep `NEXTAUTH_SECRET` unique per environment.
- Use `DIRECT_DATABASE_URL` for Prisma migrations where the provider requires a direct connection.
- Configure transactional email before enabling production sign-up, verification, and password reset flows.
- The preferred production delivery path is now workspace-owner Google OAuth for My Drive folders.
- The service-account flow remains available as a legacy fallback for shared-folder delivery and Shared Drive use cases.
- Store the Google service account private key as a multiline secret and preserve newlines when your deploy platform requires escaping.
