# CLAUDE.md — Working Notes for Claude Code

`AGENTS.md` is the agent-agnostic manifest (stack, conventions, route triplet, orchestration principles). **Read it first.** This file holds additions that only apply to Claude Code sessions.

## Subagent registry

`.claude/agents/` defines two layers:

- **Module agents** own one feature module end-to-end (route triplet + tests + design): `auth-feature`, `branches-feature`, `members-feature`, `fellowships-feature`, `departments-feature`, `outreach-feature`, `new-believers-feature`, `reports-feature`.
- **Layer agents** are role-narrow workers a module agent (or a person) dispatches: `schema-author`, `api-implementer`, `web-implementer`, `ui-component`, `test-author`, `reviewer`.

Module agents may run in parallel when their write scopes are disjoint — that's the entire reason they exist. Within a module, the layer agents run in dependency order (`schema-author → api-implementer → web-implementer → test-author → reviewer`).

## Slash commands

`.claude/commands/`:

| Command | What it does |
|---|---|
| `/plan-feature <module> <description>` | Produce a phased plan from `requirements/` + current code. Does not implement. |
| `/implement-feature <module>` | Dispatch a module agent to deliver the feature through the layer agents. |
| `/parallel-module-build <module-a> <module-b> [...]` | Run independent module agents concurrently. Reviewer fans out per module. |
| `/gap-fix <scope>` | Multi-module gap sweep (migrations → types → api-client → routes → hooks → ui). |
| `/review-branch [base]` | Dispatch `reviewer` across the current branch's diff. |

## Modern Sanctuary palette — drift warning

`DESIGN.md` is authoritative: primary `#5D3FD3`, gold `#f8b537`, gradient `from-[#451ebb] to-[#5d3fd3]`. **But** `apps/web/tailwind.config.ts` and `globals.css` still ship the older palette (`#6D28D9` / `#D97706`), and pages are mid-migration:

- Auth pages, signup, login, fellowships list, departments — already on Modern Sanctuary (via arbitrary `bg-[#5D3FD3]` classes).
- `new-believers`, members status badges, some dashboards — still on `purple-700` / `amber-400` Tailwind utilities.
- Chart color arrays disagree across `dashboard/`, `reports/`, and `components/dashboard/`.

When writing new UI: use Modern Sanctuary arbitrary values (`bg-[#5D3FD3]`, `text-[#f8b537]`, `from-[#451ebb] to-[#5d3fd3]`). When touching existing UI: migrate inline if the change is small; otherwise leave a comment and don't expand the old palette's footprint.

`/gap-fix tailwind-palette` would be the right command to migrate the design tokens themselves — propose this before doing it; it's a wide-blast-radius change.

## Things Claude has gotten wrong here before — anticipate

- **Routes are `/api/*`, not `/v1/*`.** Old planning docs say `/v1/*`. The mounted prefix in `apps/api/src/app.ts` is `/api/*`.
- **Use `enforceBranchScope`**, not `enforceBranchAccess`. The latter exists in `@kairos/utils` for legacy reasons; the convention in current services is the inline `enforceBranchScope(auth, branchId?)` and `enforceLeaderOrAbove(auth, fellowship)` helpers per service file.
- **`getAuth(c)`** (singular) is the accessor — not `getAuthContext`.
- **Module routers are mounted at `/api/{module}`**, but in `apps/api/src/app.ts` exact spellings vary (`/api/new-believers`, `/api/outreach`, `/api/souls`). Don't invent paths; read `app.ts`.
- **`packages/ui/src/components/`** is shared. `apps/web/src/components/` is app-only. New design-system primitives go in the package; one-off compositions stay in the app.
- **`(auth)` and `(dashboard)`** are App Router route groups (parentheses). Don't try to route to `/auth/login` — it's `/login` under the `(auth)/` group.
- **`@kairos/database` exports schemas by name** — `members`, `fellowships`, etc. — from `packages/database/src/index.ts`. Import from the package, not the file path.
- **There is no `pastor` or `leader` `systemRole` anymore.** `SystemRole` is `'admin' | 'member'`. Authority lives in grants in `member_roles` (`BranchAdmin`, `FellowshipLeader`, …). Gate with `requireCapability(cap, scopeFn?)` on the API and `useCapabilities().has(cap, scope?)` in the web app. `pastor` only survives as `members.honorific` — a display title with zero permission weight.
- **No role switcher, no role-selection step at login.** `/api/auth/finalize-role`, `/api/auth/switch-role`, `/api/auth/available-roles`, `apps/web/src/app/(auth)/select-role/`, and `useRoleSelectionStore` are all gone. Old planning docs that reference them are stale.

## When the user asks for a plan

Plans are conversational artifacts, not committed files. Don't create `plan-*.md`, `design-*.md`, `notes-*.md`, etc. unless the user explicitly asks. The exception is `requirements/` (product specs) — only edit those when the user is updating a spec, not when sketching an implementation.
