# AquaTrack

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health

## Operational Rules (Cowork Environment)

### Git operations on mounted repos
The Cowork sandbox cannot delete files on the mounted filesystem. Any git command
that rewrites the working tree (checkout, merge, pull, rebase) will fail with
"unable to unlink" errors. Always use `osascript` via the Control your Mac MCP
for these operations. The real repo path is `/Users/ustartupsmac/git/aquatrack`.

Always clear `.git/index.lock` and `.git/HEAD.lock` via osascript before starting
git operations — stale locks from previous sessions are common.

### Version bump on deploy
ALWAYS bump the patch version in `package.json` before deploying. Commit the
version bump as a separate commit (e.g., "chore: bump version to X.Y.Z") before
pushing. Never deploy without bumping the version first.

### Tests before deploy
ALWAYS add or update relevant tests when making code changes. Run `npm run test`
and ensure ALL tests pass before committing. If tests fail, fix them before
proceeding. Never deploy with failing tests.

### Pre-deploy build check
ALWAYS run `npm run build` locally (via osascript) before deploying to Vercel.
Never deploy without a passing local build. This avoids wasting time on remote
build failures that take 2+ minutes per attempt.

### Vercel deployment
- Project: aquatrack (org: ustartup123-1087s-projects)
- Production URL: https://aquatrack-silk.vercel.app
- Deploy command: `npx vercel --prod --yes` (run via osascript in background)
- PATH must include: `/opt/homebrew/bin:/opt/homebrew/Cellar/node/25.5.0/bin`

### Fix-deploy pipeline (MANDATORY for every fix)
After completing ANY fix or code change, ALWAYS execute this full pipeline without
asking for confirmation:

1. **Push to main** — commit and push the fix to main
2. **Run all tests** — `npm run test`; if tests fail, fix them first before proceeding
3. **Bump patch version** — increment patch in `package.json` (e.g. 0.1.2 → 0.1.3)
4. **Commit version bump** — separate commit: `chore: bump version to X.Y.Z`
5. **Run build** — `npm run build` (via osascript); if it fails, fix and retry
6. **Deploy to production** — `npx vercel --prod --yes` (via osascript in background)
7. **Report** — end with the summary line below

This pipeline is non-negotiable. Never stop after a fix without deploying. Never
deploy without passing tests. Never deploy without bumping the version.

### Post-deploy report
After finishing any code change that is merged and deployed, ALWAYS end with this
summary line:

> Code merged to main, all tests passed, deployed to production. New version: X.Y.Z

Include the actual version number from package.json. This applies to every code
change session, whether invoked via /ship or done manually.

### Generated / e2e files
- Auto-generated files (dataconnect, prisma, etc.) should have `/* eslint-disable */`
- E2e mock types should use `any` return types rather than trying to replicate
  complex interfaces like Firebase Timestamp
