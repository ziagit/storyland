# CLAUDE.md

Read this file at the start of every session, before making any changes.

## How this project is organized
- `spec.md` — source of truth for what this project should do: goals, features, scope, tech stack, non-goals. Read it before starting any work.
- `state.md` — current status: what's done, what's in progress, known issues, and a short decision log. Update it after every change.
- `docs/` — source material: story content, logo, design reference. Treat as read-only; copy what's actually needed into the app (e.g. `public/`, `content/`) rather than referencing this folder directly from app code.

If any of these files or folders don't exist yet, ask before creating them, or check what the project actually uses instead.

## Before making any change
1. Read `spec.md` to confirm the request is in scope.
2. Read `state.md` to see what's already built, so you don't duplicate or contradict existing work.
3. If a request conflicts with `spec.md`, say so — don't silently deviate from the spec.

## After every change
Update `state.md` in the same turn as the change, not afterward:
- Move finished items from "In Progress" to "Done"
- Add newly started work to "In Progress"
- Log notable decisions under "Decisions" — what was chosen and why
- Note new bugs or rough edges under "Known Issues"

## Editing spec.md
Only edit `spec.md` when actual requirements change, not for implementation details. If it looks out of date or ambiguous, ask before changing it rather than guessing.

## General conventions
- Keep commits scoped to one logical change, with a clear message.
- Don't commit build output, dependencies, or secrets (`node_modules`, `dist`/`build`/`.output`, `.env`, etc.) — confirm `.gitignore` covers these.
- Match the existing code style and structure already in the project rather than introducing a new pattern, unless asked to.
- When unsure about a requirement or design decision, ask rather than guessing.

## Project-specific details
- Name: kidstory
- Description: A Nuxt 4 + Tailwind CSS web app presenting a curated collection of short stories for kids (source content in `docs/30_short_stories_for_kids.md`).
- Tech stack: Nuxt 4, Tailwind CSS
- Package manager: npm
- Language/tooling conventions: TypeScript (Nuxt 4 default scaffold — `nuxt.config.ts`, `tsconfig.json`). Linting/formatting not yet set up — ask before assuming a style if none is configured.
- Testing approach: Not yet set up. Ask before assuming a framework if a test is requested.
