# Deployment

## Recommended target

- Vercel for the Next.js application
- Managed PostgreSQL for production
- Server-side environment variables for auth and OpenAI secrets

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
5. Verify sign-up, sign-in, workspace creation, brief save, generation, and results rendering.

## Notes

- Never expose `OPENAI_API_KEY` client-side.
- Keep `NEXTAUTH_SECRET` unique per environment.
- Use `DIRECT_DATABASE_URL` for Prisma migrations where the provider requires a direct connection.
- Configure transactional email before enabling production sign-up, verification, and password reset flows.
- Google Docs delivery is not implemented in Phase 1; only the durable integration record exists.
