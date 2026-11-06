# Contributing to MealAgenda API

Thank you for helping improve MealAgenda. English and Spanish are both welcome in issues and pull requests.

## Before starting

- Search existing issues before reporting a bug or proposing a feature.
- Agree on the scope of features, schema changes, and behavior changes in an issue first.
- Create a small branch from `develop`, for example `fix/ingredient-import-search`.
- If you do not have write access, use a fork and open the pull request against this repository's `develop` branch.
- Keep unrelated refactors out of the same pull request.

## Local setup and checks

Follow [README.md](README.md) or [README.es.md](README.es.md). Use synthetic data and dedicated local databases only.

```bash
npm run build
npm test
```

The tests may force-reset the database configured in `.env.test`. Check the URL before running them and never use production or shared data. Document migrations and destructive operational steps explicitly.

Follow the existing TypeScript controller/service/domain conventions. Add regression coverage when behavior changes and keep API or environment documentation current.

## Bug reports

Include clear reproduction steps, expected and actual results, the affected version or commit, relevant runtime/database versions, and redacted logs when useful.

Do not include passwords, tokens, private configuration, database dumps, private exports, or personal recipes without the owner's permission.

## Pull request checklist

- [ ] The change is focused and links its issue.
- [ ] Tests cover changed behavior where practical.
- [ ] Schema changes include an intentional migration and rollback/recovery notes where relevant.
- [ ] I listed the checks I actually ran and disclosed failures or skipped checks.
- [ ] Documentation is updated for APIs, configuration, and operational changes.
- [ ] No credentials, private configuration, generated coverage, or real user data are committed.

## Security reports

Do not disclose a suspected vulnerability in a public issue. Follow [SECURITY.md](SECURITY.md) and use GitHub's private vulnerability reporting.

