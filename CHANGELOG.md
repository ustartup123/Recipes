# Changelog

All notable changes to AquaTrack will be documented in this file.

## [0.1.1.1] - 2026-04-10

### Fixed
- "Create Aquarium" button now greyed out when required fields are empty, making it clear the form isn't ready to submit
- Default volume unit changed from Gallons to Liters

## [0.1.1.0] - 2026-04-09

### Fixed
- Tank creation now shows inline validation errors (required fields marked with asterisks, error messages on blur/submit) instead of silently disabling the submit button
- Tanks now appear on dashboard immediately after creation; `getAquariums()` was silently returning empty results due to a missing composite Firestore index required by the `orderBy("createdAt")` query — fixed by sorting client-side instead
- `next.config.mjs` image hostnames migrated from deprecated `domains` to `remotePatterns` (Google profile images and Firebase Storage)

## [0.1.0.0] - 2026-04-08

### Added
- Unified event model replacing separate parameter/water-change collections
- Smart Journal pages: event log, timeline with charts, AI analysis
- AI-powered water quality analysis via Vertex AI (Gemini 2.5 Flash)
- AI advisor rewrite with server-side data fetching and auth
- Firebase Admin SDK for secure server-side operations
- Firestore security rules enforcing user-level data isolation
- Composite Firestore indexes for event queries
- Structured logging with Pino (JSON output for Vercel Log Drains)
- Marine and reef aquarium type support
- Dashboard rewrite with sparkline charts and event previews
- 84 unit tests covering types, utils, validation, and event summarization
- Google sign-in error handling

### Changed
- Migrated AI provider from Anthropic Claude to Google Vertex AI
- Dashboard data loading parallelized (reduced Firestore reads by 33%)
- Analysis route Firestore fetches parallelized (events, aquarium, user context)
- Batch delete operations chunked to stay under Firestore 450-op limit

### Removed
- Legacy standalone parameter and water change pages (replaced by unified event log)
- Anthropic SDK dependency
