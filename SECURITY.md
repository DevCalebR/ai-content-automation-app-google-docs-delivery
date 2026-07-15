# Security policy

Only the latest commit on `main` is supported.

Report vulnerabilities privately through the [DevCalebR GitHub profile](https://github.com/DevCalebR). Include affected routes and reproduction steps, but remove API keys, OAuth tokens, email addresses, document contents, workspace identifiers, and database records.

Security-sensitive expectations:

- Provider credentials remain in server-only modules and deployment secrets.
- Every workspace mutation enforces server-side membership or ownership.
- OAuth state and callbacks remain validated against the canonical application origin.
- Generated content is treated as untrusted text and is not rendered as arbitrary HTML.
- Demo accounts remain disabled unless explicitly configured for a local environment.
