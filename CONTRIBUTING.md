# Contributing

1. Create a focused branch from `main` and install with `npm ci`.
2. Use local/test provider accounts and synthetic content only.
3. Preserve server-only boundaries around OpenAI, SMTP, database, OAuth, and service-account secrets.
4. Add tests for changed actions, tenant boundaries, output contracts, or delivery states.
5. Run `npm run validate` and describe migration/configuration impact in the pull request.

Do not commit `.env`, OAuth tokens, service-account private keys, generated customer content, or production database exports. Keep business claims tied to behavior that can be reproduced from this repository.
