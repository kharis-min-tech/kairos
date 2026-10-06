# Engineering docs

Reference material for people working **on** Kairos. It lives here, in the
repo, rather than on `docs.kairos.kharis.org` — that site is written for church
staff, and architecture notes, local setup and shell commands are neither
useful nor appropriate there.

## Architecture and decisions

| | |
|---|---|
| [Architecture overview](architecture-overview.md) | The workspace map, the request path, and where each app is deployed. |
| [Auth and permissions](auth-and-permissions.md) | The capability model, the four scope kinds, and the one matcher both clients and the API gate on. |
| [Database architecture](database-architecture.md) | 2026-06-24 ADR: the PlanetScale PS-5 → PS-80 path, pricing, and why not Neon or Aurora. |
| [Domain model](domain-model.md) | Personas, entities and lifecycle. Note §0: "Member" means someone who completed the four-week class, not anyone who attends. |
| [Observability](observability.md) | Logging shape, Sentry, and what is deliberately not instrumented yet. |
| [Self check-in](self-check-in.md) | The stateless HMAC token behind the rotating QR code. |

## Working in the repo

| | |
|---|---|
| [Local setup](local-setup.md) | Getting a development environment running. |
| [Commands](commands.md) | The task runner, the migration path, and which database commands are destructive. |
| [Quick demo](quick-demo.md) | Standing up a throwaway instance to show someone. |

Start with `AGENTS.md` at the repo root for conventions, and `CLAUDE.md` for the
notes specific to Claude Code sessions.
