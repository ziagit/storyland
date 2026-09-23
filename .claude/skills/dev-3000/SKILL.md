---
name: dev-3000
description: Start the kidstory Nuxt dev server on port 3000, killing whatever is already listening on that port first. Use when the user asks to run/start/restart the app or dev server, or says port 3000 is busy.
---

# Run the app on port 3000

The app must always run on port 3000. If something else holds the port, kill it and take it over.

## Steps

1. **Free the port.** From the project root run:

   ```bash
   bash .claude/skills/dev-3000/free-port.sh 3000
   ```

   It prints what was on the port (if anything), sends SIGTERM, escalates to SIGKILL after ~5s, and exits non-zero if the port is still taken. If it fails, stop and show the user the output — don't fall back to another port.

2. **Start the server on 3000.**
   - In the Claude desktop app: call `preview_start` with `{ "name": "pro-nuxt-dev" }` (defined in `.claude/launch.json`, port 3000, `autoPort: false`). If a preview server is already registered from this session, `preview_stop` it first so it actually restarts.
   - Elsewhere (plain CLI): run `npm run dev -- --port 3000` with Bash `run_in_background: true`.

3. **Verify.** Wait for the server to come up, then confirm it's serving:

   ```bash
   curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/
   ```

   Expect `200`. If not, check the server logs (`preview_logs` or the background task output) and report the error.

4. Tell the user the app is running at http://localhost:3000, and mention which process (if any) was killed.
