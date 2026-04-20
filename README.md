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

Run from this project directory (the Vercel link in `.vercel/` scopes
the command to the `recipes` project). The CLI's newer `logs` command is
historical by default; pass `--follow` for live streaming.

```bash
# Recent logs (last 24h, linked project, current branch)
npx vercel logs

# Live stream (5-min session)
npx vercel logs --follow

# Errors from the last hour, production only
npx vercel logs --level error --environment production --since 1h

# Full-text search across messages (e.g. find one request by reqId)
npx vercel logs --query "<reqId-from-an-error>" --expand

# By Vercel request id (shown as x-vercel-id in browser devtools)
npx vercel logs --request-id <vercel-req-id>

# JSON Lines → jq, filter to one user
npx vercel logs --json --since 1h \
  | jq -c 'select(.message | test("\"userId\":\"<uid>\""))'

# 5xx on the parse-url route, last hour
npx vercel logs --status-code 5xx --since 1h --query "parse-url" --expand
```

Pipe `--json` through `jq` for structured filtering on fields the app adds
(`reqId`, `userId`, `route`, `durationMs`, `host`). Note: those fields live
inside the stringified log line, so use `jq 'select(.message | test("…"))')`
rather than `.reqId` directly.

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
