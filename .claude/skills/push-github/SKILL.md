---
name: push-github
description: Commit the kidstory app's pending changes and push them to GitHub (origin = github.com:ziagit/storyland, branch main). Use when the user asks to push, publish to GitHub, sync, or "save my changes to the repo".
---

# Push the app to GitHub

Remote: `origin` → `git@github.com:ziagit/storyland.git`. Target branch: `main`.
The owner wants changes committed, merged into `main` and pushed **without asking for confirmation** each time. Exception: give a one-line heads-up first if the change touches payments, auth, or could break production.

## Steps

1. **Look at what's pending.**

   ```bash
   git status --short && git branch --show-current && git log --oneline @{u}..HEAD 2>/dev/null
   ```

   If there's nothing to commit and nothing ahead of `origin`, say it's already up to date and stop.

2. **Choose what to stage. Never use `git add -A` / `git add .` blindly.**
   - Never stage secrets or generated files: `.env*` (except `.env.example`), `node_modules`, `.nuxt`, `.output`, `.data`, `.nitro`, `.cache`, `dist`, `.vercel`, `.claude/settings.local.json`, or `*.log`. `.gitignore` covers these already. If one still shows up, stop and fix `.gitignore` first.
   - Scratch-looking untracked files (names starting with `_`, `tmp`, `test-` or similar, e.g. `scripts/_yt-test.mjs`): list them and ask whether to include them. Don't commit them silently.
   - Scan what's staged for leaked credentials before committing:

     ```bash
     git diff --cached | grep -nE '(sk-|sk_live_|rk_live_|AKIA|ghp_|xox[bp]-|-----BEGIN [A-Z ]*PRIVATE KEY|SUPABASE_SERVICE_ROLE|api[_-]?key\s*[:=]\s*["'\''][A-Za-z0-9])' || echo "no secrets found"
     ```

     If anything matches, stop and show the user. Don't push.

3. **Update `state.md`** (CLAUDE.md requires this for every change) if it doesn't already reflect the work. Include it in the same commit.

4. **Commit.** Use one commit per logical change, with a clear imperative subject line, ending with the attribution trailer given in the session's system reminder (if there is one). Use a heredoc for multi-line messages.

5. **Get onto `main`, up to date.**
   - On a feature branch: commit there, then `git checkout main`, `git pull --rebase origin main`, `git merge --no-ff <branch>`.
   - On `main`: `git pull --rebase origin main`.
   - If there's a conflict, stop, show the conflicting files, and ask. Don't resolve business logic by guessing.

6. **Push.**

   ```bash
   git push origin main
   ```

   **Never** force-push (`--force` / `--force-with-lease`) to `main`. If the push is rejected, pull/rebase again and retry once. If it's rejected again, report back.

7. **Verify and report.**

   ```bash
   git status -sb && git log --oneline -5
   ```

   `main` should show no `ahead`/`behind`. Tell the user the pushed commit hashes and subjects, plus anything you left unstaged and why. Mention that pushing `main` triggers the Vercel production deploy.
