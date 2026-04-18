# Recipes

Personal recipe library with AI-assisted import (parse URLs, text, and YouTube videos into structured recipes). Hebrew UI (RTL). Port of the legacy Express + Vite Recipes app onto the next-firebase-template stack.

## Stack

- Next.js 14 (App Router) + TypeScript
- Firebase Auth (Google), Firestore, Admin SDK
- Tailwind CSS
- Vitest (unit) + Playwright (e2e)
- Vercel deploy

## Operational Rules

### Version bump on deploy
ALWAYS bump the patch version in `package.json` before deploying. Commit the
version bump as a separate commit (e.g., "chore: bump version to X.Y.Z")
before pushing. Never deploy without bumping the version first.

### Tests before deploy
ALWAYS add or update relevant tests when making code changes. Run
`npm run test` and ensure ALL tests pass before committing. If tests fail,
fix them before proceeding. Never deploy with failing tests.

### Pre-deploy build check
ALWAYS run `npm run build` locally before deploying to Vercel. Never deploy
without a passing local build. This avoids wasting time on remote build
failures that take 2+ minutes per attempt.

### Vercel deployment
- Project: recipes
- Production URL: TBD (filled after first deploy)
- Deploy command: `npx vercel --prod --yes`

### Fix-deploy pipeline (MANDATORY for every fix)
After completing ANY fix or code change, ALWAYS execute this full pipeline
without asking for confirmation:

1. **Push to main** — commit and push the fix to main
2. **Run all tests** — `npm run test`; if tests fail, fix them first
3. **Bump patch version** — increment patch in `package.json`
4. **Commit version bump** — separate commit: `chore: bump version to X.Y.Z`
5. **Run build** — `npm run build`; if it fails, fix and retry
6. **Deploy to production** — `npx vercel --prod --yes`
7. **Report** — end with the summary line below

This pipeline is non-negotiable. Never stop after a fix without deploying.
Never deploy without passing tests. Never deploy without bumping the version.

### Post-deploy report
After finishing any code change that is merged and deployed, ALWAYS end
with this summary line:

> Code merged to main, all tests passed, deployed to production. New version: X.Y.Z

### Generated / e2e files
- Auto-generated files should have `/* eslint-disable */`
- E2e mock types may use `any` return types rather than replicating
  complex interfaces like Firebase Timestamp

## GCP Secret Key Hygiene

### .env files
- All credentials MUST be in `.env` (never hardcoded)
- `.env` MUST be in `.gitignore` — verify before any `git add`
- Provide a `.env.example` with placeholder values (no real secrets)

### Code generation
- Access keys via `process.env.KEY` or equivalent
- Never suggest hardcoded default key values as fallbacks
- Always include a startup check that fails loudly if required secrets
  are missing (see `lib/env-check.ts`)
