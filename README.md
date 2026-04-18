# Recipes

Personal recipe library with AI-assisted import. Parse recipes from URLs, pasted
text, or YouTube videos into structured ingredients / instructions / tags, then
save them to a per-user Firestore library. Hebrew UI (RTL).

Scaffolded from [next-firebase-template](https://github.com/ustartup123/next-firebase-template).

## Stack

- Next.js 14 App Router + TypeScript
- Firebase Auth (Google), Firestore, Admin SDK, Storage
- Tailwind CSS, Lucide icons, react-hot-toast
- Gemini 2.5 Flash for recipe parsing
- Vitest (unit) + Playwright (e2e)
- Vercel deploy

## Local setup

```bash
npm install
cp .env.example .env   # fill in Firebase + Gemini keys
npm run dev
```

Then visit http://localhost:3000 (use `?dev-login=true` in development to skip
Google sign-in).

## Deploy

```bash
npm run test
npm run build
npx vercel --prod --yes
```

See `CLAUDE.md` for the mandatory fix-deploy pipeline.

## Logs

The app emits structured JSON logs via `pino` (see `lib/logger.ts`). Every
server-side request gets a request-scoped child logger with these fields:

- `reqId` — unique per request (use this to follow one request across lines)
- `route` — e.g. `parse-url`, `parse-text`
- `userId` — Firebase uid, added after `auth: ok`
- `durationMs` — on `request: done` / `request: failed` lines
- `host` — for URL-fetching paths

### Tailing production logs

```bash
# Live tail (stream all production logs)
npx vercel logs recipes --follow

# Last hour, filter to the parse-url route
npx vercel logs recipes --since 1h | grep '"route":"parse-url"'

# Follow one request end-to-end once you have a reqId from an error
npx vercel logs recipes --since 1h | grep '<reqId-from-error>'

# Only errors
npx vercel logs recipes --since 1h | grep '"level":"error"'

# One user's requests
npx vercel logs recipes --since 1h | grep '"userId":"<uid>"'
```

### Local logs

During `npm run dev`, logs go to stdout in a human-readable shape.
Set `LOG_LEVEL=debug` to see everything:

```bash
LOG_LEVEL=debug npm run dev
```

### What gets logged where

- `app/api/ai/parse-url/route.ts` — request start, auth, URL accepted, fetch,
  extract, gemini prompt/response, request done
- `app/api/ai/parse-text/route.ts` — same shape, minus fetch/extract
- `lib/ai/fetch-and-extract.ts` — fetch latency + status + bytes, extraction
  strategies used, content length
- `lib/gemini.ts` — call start, each retry, final ok/failed with duration
- `lib/firebase-admin.ts` — admin init, auth success/failure with reason
  (`expired`, `revoked`, `malformed`, `invalid`)
- `lib/env-check.ts` — missing required env keys at boot
