# Deploy

Ship the current branch to production. Runs the full preflight checklist, commits,
pushes, creates/updates a PR, merges to main, and lets Vercel auto-deploy.

## Preflight

Run these checks in parallel. If any fail, stop and fix before continuing.

```bash
npx tsc --noEmit
```

```bash
npx vitest run
```

If either fails, diagnose and fix. Re-run until both pass.

## Stage and Commit

1. Run `git status` to see all changes.
2. If there are unstaged changes, group them into logical commits:
   - Infrastructure changes (dependencies, config) first
   - Feature code + related tests together
   - VERSION + CHANGELOG last
3. Each commit message: `<type>: <summary>` (feat/fix/chore/perf/refactor/docs)
4. Final commit gets the co-author trailer:
   ```
   Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
   ```

If working tree is clean (everything already committed), skip to Push.

## Push

```bash
git push -u origin $(git branch --show-current)
```

## Create or Update PR

Check if a PR already exists:

```bash
gh pr view --json url,number,state -q 'if .state == "OPEN" then "EXISTING" else "NONE" end' 2>/dev/null || echo "NONE"
```

**If EXISTING:** Update the PR body with `gh pr edit`.
**If NONE:** Create with `gh pr create --base main`.

PR body format:

```markdown
## Summary
<What changed and why, grouped by theme>

## Tests
- Vitest: N tests passing
- TypeScript: clean

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## Merge

```bash
gh pr merge --merge
```

## Verify Deployment

After merge, check that Vercel picked it up:

```bash
gh pr view --json mergedAt -q .mergedAt
```

Print: "Merged to main. Vercel auto-deploying — check the Vercel dashboard for status."

## Quick Reference

| What | How |
|------|-----|
| Tests | `npx vitest run` |
| Types | `npx tsc --noEmit` |
| Logs (local) | Terminal stdout, set `LOG_LEVEL=debug` in `.env` |
| Logs (prod) | Vercel Dashboard → Logs tab |
| Deploy | Auto on merge to main via Vercel |
| Rollback | Vercel Dashboard → Deployments → promote previous |
