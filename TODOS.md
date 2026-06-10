# claude-rc — TODOS

Deferred work, with enough context to pick up cold. Priority: P1 blocks ship,
P2 same-branch, P3 follow-up.

## Deferred from CEO review (2026-06-10)

### `claude-rc doctor` — preflight/health command (P3)
- **What:** One command that checks the things that break setup — tmux present,
  `claude` on PATH, node version, tailscale present, service active, token set,
  port reachable — and prints pass/fail with a fix hint per failure.
- **Why:** For an OSS tool it converts "it doesn't work" issues into self-served
  fixes. Biggest support-load reducer for the price.
- **Context:** Reuse the prerequisite checks `src/cli/setup.mjs` already does
  (the `which()` calls) plus `serviceStatus()` from `src/cli/platform.mjs` and a
  loopback fetch to the configured port. New file `src/cli/doctor.mjs`, wire into
  the dispatcher (`bin/claude-rc.mjs`) and help.
- **Effort:** S (human) → S (CC). **Depends on:** nothing.
- **Decision:** Deferred at CEO review — add once real setup issues surface the
  actual failure modes worth checking.

### Client-only "machines" switcher on the phone (P3)
- **What:** The panel remembers a list of *other* panel URLs (localStorage) and
  lets you tap between machines from one bookmark. Pure client-side.
- **Why:** You run one panel per machine (MacBook, VPS); the phone juggles several
  URLs today. This eases that without the server ever reaching another box.
- **Context:** Hard constraint — this must stay **client-only**. The server never
  gains cross-box access; no SSH, no credentials to other machines. Just a
  localStorage list of `{label, url}` and a switcher in `app.vue`. Keeps the
  one-per-machine security model intact (see SECURITY.md).
- **Effort:** S–M (human) → S (CC). **Depends on:** nothing.
- **Decision:** Deferred at CEO review — revisit once running 2+ panels in anger.
