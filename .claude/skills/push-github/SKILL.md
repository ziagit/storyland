---
name: push-github
description: Commit the kidstory app's pending changes and push them to GitHub (origin = github.com:ziagit/storyland, branch main). Use when the user asks to push, publish to GitHub, sync, or "save my changes to the repo".
---

# Push the app to GitHub

Remote: `origin` → `git@github.com:ziagit/storyland.git`. Target branch: `main`.
**Fully automatic: never ask the user anything.** Don't ask for confirmation, don't ask which files to include, and don't give a heads-up before pushing. Make every decision below yourself, push, then report what happened. The only things that stop a push are the hard blocks in steps 2 and 5, and even then you report the problem rather than asking a question.

## Steps

1. **Look at what's pending.**

   ```bash
   git status --short && git branch --show-current && git log --oneline @{u}..HEAD 2>/dev/null
   ```

   If there's nothing to commit and nothing ahead of `origin`, say it's already up to date and stop.

2. **Choose what to stage. Never use `git add -A` / `git add .` blindly.**
   - Never stage secrets or generated files: `.env*` (except `.env.example`), `node_modules`, `.nuxt`, `.output`, `.data`, `.nitro`, `.cache`, `dist`, `.vercel`, `.claude/settings.local.json`, or `*.log`. `.gitignore` covers these already. If one still shows up, stop and fix `.gitignore` first.
   - Everything else that's modified or untracked gets committed. The one exception is scratch-looking untracked files (names starting with `_`, `tmp` or `scratch`, e.g. `scripts/_yt-test.mjs`): leave them out without asking, and list them in the final report.
   - Scan what's staged for leaked credentials before committing:

     ```bash
     git diff --cached | grep -nE '(sk-|sk_live_|rk_live_|AKIA|ghp_|xox[bp]-|-----BEGIN [A-Z ]*PRIVATE KEY|SUPABASE_SERVICE_ROLE|api[_-]?key\s*[:=]\s*["'\''][A-Za-z0-9])' || echo "no secrets found"
     ```

     **Hard block:** if anything matches a real credential (not just a regex or pattern in docs/code like this file), unstage that file, push everything else, and report the file that was held back. Secrets on GitHub can't be un-leaked, so this is the one thing never pushed automatically.

3. **Update `state.md`** (CLAUDE.md requires this for every change) if it doesn't already reflect the work. Include it in the same commit.

4. **Commit.** Use one commit per logical change, with a clear imperative subject line, ending with the attribution trailer given in the session's system reminder (if there is one). Use a heredoc for multi-line messages.

5. **Get onto `main`, up to date.**
   - On a feature branch: commit there, then `git checkout main`, `git pull --rebase origin main`, `git merge --no-ff <branch>`.
   - On `main`: `git pull --rebase origin main`.
   - **Hard block:** if there's a conflict, resolve it yourself when it's mechanical (e.g. both sides appended to `state.md`: keep both). If it's a real logic conflict, `git rebase --abort` / `git merge --abort` so the repo is left clean, and report the conflicting files. Don't guess at business logic.

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
