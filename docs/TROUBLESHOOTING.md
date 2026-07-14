# Troubleshooting

## Authentication redirects to an unexpected origin

Set `APP_URL` and `NEXTAUTH_URL` to the same canonical origin. Use `http://localhost:3000` only for local development and register the exact Google OAuth callback for each environment.

## Prisma cannot connect

Confirm `DATABASE_URL`, run `npm run db:generate`, then apply migrations. Use `DIRECT_DATABASE_URL` only when the database provider requires a separate direct connection for migration tooling.

## Generation fails before calling OpenAI

Check the validated environment, model availability, workspace access, brief fields, and safety response. Do not log the API key or full sensitive brief content.

## Google Docs delivery fails

For OAuth, reconnect the test account and confirm folder access. For service accounts, preserve private-key line breaks and share the destination folder with the configured service-account email. The run remains saved even when delivery fails.

## Email verification does not arrive

Confirm SMTP host, port, TLS setting, credentials, and `EMAIL_FROM`. In development, inspect the server-side delivery error without exposing SMTP credentials to the browser.
