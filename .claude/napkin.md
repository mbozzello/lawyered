# Napkin

## Corrections
| Date | Source | What Went Wrong | What To Do Instead |
|------|--------|----------------|-------------------|
| 2026-02-19 | self | Vercel project had `"framework": null` (preset: "Other") causing 404 on all routes despite successful build | Check `vercel project inspect` output — if Framework Preset is "Other", update via API: `PATCH /v9/projects/{id}` with `{"framework":"nextjs"}`. The `vercel.json` `"framework"` field does NOT override dashboard settings. |
| 2026-02-20 | self | Assumed `next/font/google` is safe in CI; builds can fail when Google Fonts fetch is blocked/transient | Prefer local/system fonts (`next/font/local` or CSS variables) for deterministic Vercel builds. |
| 2026-02-20 | self | Ran `rg` against non-existent `app/` path and got avoidable noise | Target only existing paths in this repo (`src/`, root files). |
| 2026-02-20 | self | Interpreted a sandbox-denied Turbopack panic as potential app issue | Re-run `npm run build` with escalated permissions before drawing conclusions from local sandbox errors. |
| 2026-02-20 | self | Shell has `ANTHROPIC_API_KEY=""` globally (from Claude Code), Next.js won't override existing env vars from `.env.local` | Use lazy `getClient()` instead of module-level `new Anthropic()`. For local dev: `env -u ANTHROPIC_API_KEY npx next dev`. On Vercel this isn't an issue since env var is set correctly. |
| 2026-02-20 | self | Spent many attempts trying to update Vercel env var via PATCH API — it returned success but didn't actually save | Delete and recreate env vars instead of PATCHing. Or use `type: "plain"` first to verify, then switch to `encrypted`. |
| 2026-02-20 | self | Vercel deploy API returned `internal_server_error` consistently for ~20 min | Vercel API can have transient outages. Use `vercel deploy --prod` with linked project as fallback. Write `.vercel/project.json` manually if `vercel link` fails in non-interactive mode. |
| 2026-02-20 | self | Claude wraps JSON in markdown fences despite system prompt saying not to | Always strip ```json fences before JSON.parse. Use shared `extractJSON()` helper. |
| 2026-02-20 | self | Polling fetch calls returned stale/cached data — progress bar didn't update until hard refresh | Always use `cache: "no-store"` on fetch calls used for polling. Also use a lightweight `/status` endpoint instead of fetching full contract with clauses. |

## User Preferences
- Prefers fixing locally first before deploying
- Gets frustrated with repeated failed deploys — move faster to root cause

## Patterns That Work
- Use Vercel API directly when CLI has scope/interactive issues: `curl -X PATCH https://api.vercel.com/v9/projects/{id}?teamId={teamId}`
- Auth token lives at `~/Library/Application Support/com.vercel.cli/auth.json`
- After changing framework setting, must redeploy for it to take effect
- Replace `next/font/google` with local/system fonts when deployment logs show Google Fonts fetch errors
- If local build panics with `Operation not permitted (os error 1)` in this environment, verify with escalated build before debugging app code
- For local dev with Claude Code: `env -u ANTHROPIC_API_KEY npx next dev` to let `.env.local` take effect
- Write `.vercel/project.json` manually with `projectId` + `orgId` to bypass `vercel link` interactive mode issues
- Deploy hook for manual triggers: `POST https://api.vercel.com/v1/integrations/deploy/prj_.../hookId`

## Patterns That Don't Work
- `vercel.json` `"framework"` field doesn't override Vercel dashboard Framework Preset setting
- `npx vercel` CLI commands fail in non-interactive mode without `--scope` flag when multiple teams exist

## Domain Notes
- Next.js 16.1.6 app with Turbopack, Prisma, NextAuth (credentials), Anthropic AI
- Vercel team: `mbozzello-stocktwitscs-projects` (team_43nIEkXjj8gc7wD2pFKmsBgF)
- Project ID: prj_2gFl7OrZ3WgqYDRrqMOjrL1vq9e8
- GitHub: mbozzello/lawyered
- Production URL: https://lawyered-gold.vercel.app
