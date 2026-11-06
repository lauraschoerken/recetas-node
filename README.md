# MealAgenda — API

[Español](README.es.md)

REST API for MealAgenda, built with TypeScript, Express, Prisma, and PostgreSQL. It provides authentication and the server-side behavior for recipes, ingredients, meal plans, shopping lists, household stock, shared households, alerts, profiles, and workouts.

The web client lives in [recetas-react](https://github.com/lauraschoerken/recetas-react). For the controller, service, domain, and persistence design, see [ARCHITECTURE.md](ARCHITECTURE.md).

## Requirements

- Node.js 24.14.1 and npm 11.11.0 were used for the latest local verification. The project targets modern supported Node.js releases.
- PostgreSQL 15 or a compatible release. Use separate databases for development and tests.

## Local development

```bash
git clone --branch develop https://github.com/lauraschoerken/recetas-node.git
cd recetas-node
npm ci
Copy-Item .env.example .env  # PowerShell
# cp .env.example .env       # macOS/Linux
npm run prisma:generate
npx prisma migrate deploy
npm run dev
```

Before applying migrations, confirm that `DATABASE_URL` points to your dedicated local database. The provided `.env.example` uses port `3002`; if `PORT` is omitted, the code falls back to `3001`. With the example configuration, check `http://localhost:3002/health`; interactive API documentation is available at `http://localhost:3002/api-docs`.

## Configuration

Copy `.env.example` to `.env` and replace its placeholders. Do not commit `.env`, `.env.test`, credentials, tokens, or database exports.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection used by Prisma. Development and test databases must be different. |
| `JWT_SECRET` | Yes | Private, high-entropy secret used to sign authentication tokens. |
| `PORT` | No | HTTP port; defaults to `3001`. |
| `CORS_ALLOWED_ORIGINS` | Deployment | Comma-separated browser origins allowed by CORS. Local fallback origins are used when omitted. |
| `JSON_BODY_LIMIT` | No | Express JSON/import size limit; defaults to `10mb`. |
| `APP_URL` | Invitations | Public web URL used to build invitation links; defaults to `http://localhost:5173`. |
| `SMTP_HOST`, `SMTP_PORT` | Email | SMTP server; default host/port are `smtp.gmail.com:587`. |
| `SMTP_USER`, `SMTP_PASS` | Email | SMTP credentials. Invitation email is skipped when they are absent. |
| `SMTP_FROM` | No | Sender address; falls back to `SMTP_USER` and then `noreply@recetas.app`. |
| `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD` | Bootstrap | Credentials used by the administrative bootstrap. Set explicit safe values before running outside an isolated local environment. |
| `NODE_ENV` | Tests/deployment | Runtime mode. Jest sets it to `test`. |
| `ALLOW_TEST_ENDPOINTS` | Tests only | Enables destructive test cleanup endpoints when `true`. Never enable in production. |

## Build and run

```bash
npm run build
npm start
```

`npm start` runs the compiled `dist/index.js`. The Docker workflow builds and publishes an image when `develop` is updated; that does not by itself prove or perform a production deployment.

## Tests

Create a disposable test configuration without overwriting an existing `.env.test`:

```bash
Copy-Item .env.test.example .env.test  # PowerShell
# cp .env.test.example .env.test       # macOS/Linux
```

Review `DATABASE_URL` carefully, then run:

```bash
npm test
npm run test:coverage
```

**Destructive behavior:** Jest's global setup first runs `prisma migrate deploy`. If that fails, it runs `prisma db push --force-reset --accept-data-loss` against the `DATABASE_URL` loaded from `.env.test`. The `npm run test:db:setup` script also force-resets a hard-coded local database. Never run either command with a production, shared, or valuable database URL.

### Verification status

On 6 November 2026, a dependency-free copy completed `npm ci` and `npm run build`. The test command was attempted only with the configured `recipes_db_test` target, but PostgreSQL was not available on port `5432`; no test cases ran and no other database was used.

## Local, test, and deployed environments

- **Local development:** private `.env`, dedicated development database, API normally on port `3002` with the provided example.
- **Tests:** private `.env.test`, disposable database, `NODE_ENV=test`; cleanup and reset operations are expected.
- **Deployment:** secrets supplied by the hosting platform, explicit CORS and public app URL, test endpoints disabled. A deployed instance contains real accounts and is not a test environment.

## Common problems

- **Database connection fails:** verify PostgreSQL is running, the database exists, and every part of `DATABASE_URL` is correct.
- **Migration fails:** confirm the target database and run `npm run prisma:generate`; do not use a forced reset to repair valuable data.
- **Web requests fail with CORS:** add the exact web origin to `CORS_ALLOWED_ORIGINS` and restart the API.
- **Frontend proxy returns connection errors:** make `VITE_API_URL` match the API's configured `PORT` (`3002` in the local examples).
- **Port already in use:** stop the conflicting process or set a different `PORT`, then update clients and tests.
- **Invitations are not sent:** configure SMTP credentials. Without them, the service logs that email is disabled.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## License

Copyright © 2025 Laura Schörken. The source code is available under the [MIT License](LICENSE). See [Third-Party Notices](THIRD_PARTY_NOTICES.md) for bundled dependencies. Product names, images, recipes, and third-party material may have separate rights.
