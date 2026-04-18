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
- Production URL: https://recipes-rho-plum.vercel.app
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

## Debugging Firebase/GCP issues

Earned the hard way. Read this before chasing client-code hypotheses
when something touching Firebase fails.

### Invoke `firebase-basics` first
Any symptom involving Firebase Auth, Firestore, or Storage: invoke the
`firebase-basics` skill BEFORE any other debugging tool. Its
provisioning-check steps catch the bugs that look like client-code bugs
but aren't.

### Check the component boundary before editing code
When a browser action hangs talking to an external service (Firestore,
a third-party API), do NOT start with client-code hypotheses. Inspect
the request at the boundary first:
- DevTools → Network → click the failing request → **Response** tab.
  No status code + "Provisional headers are shown" = the socket opened
  but no HTTP response came back. That signature = infra/provisioning
  issue, not a code bug.
- Run `npm run preflight` — fails loud if any required Google API is
  disabled OR the `(default)` Firestore database doesn't exist. This
  runs automatically as `predev`, so `npm run dev` enforces it.
- Manual equivalents:
  ```
  gcloud services list --enabled --project=recipes-9cfda
  gcloud firestore databases describe --database='(default)' --project=recipes-9cfda
  ```

### No symptom fixes before root cause
Safety nets (timeouts, retries, graceful degradation) are fine to ship,
but they are NOT substitutes for finding the cause. If three code-level
fixes have failed to resolve a symptom, stop editing code and verify
infrastructure/provisioning before the fourth attempt.
