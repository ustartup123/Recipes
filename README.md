# next-firebase-template

Opinionated Next.js 14 + Firebase + Vercel starter for small full-stack apps.

## What's included

- **Next.js 14** App Router + TypeScript
- **Firebase** Auth (Google), Firestore, Admin SDK, Storage
- **Tailwind CSS** with a dark slate-950 base palette and Fira fonts
- **Vitest** for unit tests, **Playwright** for e2e (with a Firestore mock)
- **Pino** structured logging
- **Lucide** icons + **react-hot-toast**
- **Recharts**, **Papaparse** (kept for common app needs; remove if unused)
- Per-user isolation pattern wired through Firestore rules
- Dev auth bypass (`?dev-login=true` in development) so e2e tests skip Firebase
- `lib/env-check.ts` startup check for required server env vars
- `lib/version.ts` exposes `package.json` version to the client

## Use as a template

This repo is configured as a GitHub template. Click **"Use this template"** on
the GitHub page, then:

```bash
git clone git@github.com:YOUR_USER/YOUR_NEW_APP.git
cd YOUR_NEW_APP
npm install
cp .env.example .env
# fill in Firebase config
npm run dev
```

## Setup

1. **Firebase project** — create one at https://console.firebase.google.com
   - Enable Auth → Google sign-in
   - Create a Firestore database
   - Copy web app config into `.env`
2. **Firestore rules** — `firestore.rules` ships a default-deny + a `users/{userId}`
   block. Add a `match /YOUR_COLLECTION/{id}` block with the per-user `userId`
   pattern for every collection you create.
3. **Vercel** — `npx vercel link` to attach, then `npx vercel --prod --yes`
   to deploy. Set the same env vars in the Vercel dashboard.

## Project layout

```
app/                Next.js App Router pages
  layout.tsx        Root layout (AuthProvider + Toaster + env check)
  page.tsx          Redirects to /login
  login/            Google sign-in
  settings/         Account + sign out
components/
  layout/           AppShell (auth-gated wrapper) + Navbar
  ui/               EmptyState, LoadingSpinner, Modal
context/
  AuthContext.tsx   Firebase Auth + dev bypass
lib/
  firebase.ts       Lazy-initialized client SDK
  firebase-admin.ts Admin SDK
  firestore.ts      Worked-example helpers (items collection)
  __e2e__/          In-memory Firestore mock for Playwright
  env-check.ts      Server-side env var check
  logger.ts         Pino
  utils.ts          cn(), date helpers, toDateOrNull
  types.ts          Domain types
  version.ts        APP_VERSION
__tests__/          Vitest unit tests
e2e/                Playwright tests (login + navigation)
firestore.rules     Default-deny + users/{userId}
firestore.indexes.json  Empty — add as queries demand
```

## Conventions

- Every user-scoped Firestore document carries a `userId` field
- Firestore rules enforce `request.auth.uid == resource.data.userId`
- Sort client-side when feasible to avoid composite-index requirements
- Server timestamps via `serverTimestamp()`
- Dev bypass uses `?dev-login=true` only when `NODE_ENV === "development"`

## Scripts

```
npm run dev          Next dev server
npm run build        Production build
npm run start        Run production build
npm run lint         next lint
npm run test         Vitest
npm run test:watch   Vitest watch
npm run test:e2e     Playwright headless
npm run test:e2e:ui  Playwright UI mode
```
