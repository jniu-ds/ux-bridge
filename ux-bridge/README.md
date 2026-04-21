# UX Bridge

## Architecture Notes

This first-pass collaboration foundation keeps the current UX Bridge product behavior intact while adding the missing project architecture scaffolding needed for project-scoped Codex work.

### Source of truth

- `Project` remains the primary application record in `projects-store.js`.
- Project pages remain the durable UI units inside a project.
- Each project now carries scaffolded collaboration metadata:
  - `codexContextId`
  - `projectMembers`
  - `prototypeLinks`
  - `editSessions`
  - `pageLocks`
  - `codexAccessMode`
  - `visibility`

### Filesystem scaffolding

Project and page creation now scaffold a durable workspace under:

- `project-workspaces/<project-id>/src/shell/`
- `project-workspaces/<project-id>/src/project/`
- `project-workspaces/<project-id>/src/pages/<page-slug>/`

Each page scaffold includes:

- `page.config.json`
- `page.tsx`
- `page.prompt.md`

Project-level manifests include:

- `project.config.json`
- `pages.manifest.json`
- `prototype-links.json`
- `design-tokens.json`

The scaffold is additive. Existing runtime rendering still works, and the filesystem layer is there to support future Codex/session-driven editing without forcing a full preview/runtime rewrite in this pass.

### Codex collaboration model

- A `Project` owns a persistent `codexContextId`.
- Individual users create isolated `EditSession` records per project or page.
- Each project workspace can now initialize as its own lightweight git repository.
- Edit sessions create real git branches and isolated git worktrees off that project workspace.
- Merge actions now merge the edit-session branch back into the project workspace and clean up the worktree/branch.
- `PageLock` entries are soft locks intended to coordinate concurrent editing without blocking the current UI.
- The web app now talks to a `project-session-worker.js` adapter instead of calling the local git implementation directly, which keeps the current local mode intact while preparing for a dedicated remote execution host later.
- A dedicated worker server scaffold now exists in `project-session-worker-server.js`, so the app can switch to HTTP-based git/worktree execution by setting:
  - `UX_BRIDGE_GIT_EXECUTION_MODE=remote`
  - `UX_BRIDGE_GIT_WORKER_URL=...`
  - `UX_BRIDGE_GIT_WORKER_TOKEN=...`

### Permissions

- Global `Admin` / `Designer` access remains intact.
- Project-level member roles are normalized as `owner`, `admin`, `contributor`, and `viewer`.
- `codexAccessMode` is enforced when creating edit sessions.

### Intentionally scaffolded integration points

The following pieces are modeled and enforced at the API layer, but still intentionally scaffold external infrastructure rather than pretending it already exists:

- project review pipelines
- Codex-managed file merges
- richer diff/compare review UX on top of the real git session layer

That keeps the UI/prototyping focus front and center while leaving clean extension points for later passes.

## Database groundwork

UX Bridge now includes the first database-migration groundwork for a longer-lived storage split:

- Postgres is intended to become the durable source of truth for core records.
- Redis remains the right home for sessions, reset tokens, caches, and ephemeral presence.

Included scaffolding:

- `db/config.js` for shared storage/env inspection
- `db/postgres.js` for Postgres connection checks
- `db/redis.js` for shared Redis config, commands, and connectivity checks
- `db/migrations/0001_initial.sql` as the first durable schema scaffold
- `npm run db:status` to inspect storage wiring
- `npm run db:migrate` to apply the initial schema once Postgres is configured
- `npm run db:backfill` to copy existing Redis-backed durable records into Postgres
- `/api/health/storage` for a safe runtime storage-health snapshot, including live Postgres and Redis status

This pass now routes durable users, projects, comments, and tool-integration secrets through Postgres when it is configured, while keeping Redis responsible for sessions, reset tokens, caches, and ephemeral state.
