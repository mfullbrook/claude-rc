# Contributing to claude-rc

Thanks for your interest! claude-rc is a small, deliberately-focused tool, so before you build,
please read the scope rule below.

## The one hard scope rule: no terminal streaming

claude-rc rides Claude Code's **native** Remote Control relay — the official Claude app is the
session UX. We will **not** accept features that stream or render the terminal/session
(xterm.js, PTY proxying, in-browser session output, etc.). That's the entire reason the project
stays small; it's the line that separates us from terminal-streamer tools. PRs that cross it
will be declined, however well-implemented.

Enrichment via Claude Code **hooks** is fine — that's sanctioned, out-of-band metadata, not the
live stream.

## Project layout

```
core/      Plain-ESM logic shared by the CLI and the server (tmux, launch, state, transcript)
src/cli/   The `claude-rc` CLI subcommands (framework-free)
bin/       CLI entry point
server/    Nitro API routes + SSE + auth middleware
app.vue    The Vue + Nuxt UI panel
hooks/     The Claude Code hook script
test/      Vitest unit tests for the pure logic
```

`core/` is deliberately framework-free so the CLI runs straight from source and the Nitro build
can bundle the same logic.

## Dev setup

```bash
npm ci
npm run dev          # Nuxt dev server (panel + API) on http://localhost:3000
# launch test sessions without starting real Claude:
DRY_RUN=1 node bin/claude-rc.mjs new demo ~   # (the launcher honours DRY_RUN)
```

To avoid touching your real `rc` tmux session while developing, set a throwaway session and
state dir:

```bash
export CLAUDE_RC_TMUX_SESSION=claude-rc-dev CLAUDE_RC_STATE_DIR=/tmp/claude-rc-dev
```

## Before you push

```bash
npm run lint     # Biome (also: npm run format to auto-fix)
npm test         # Vitest
npm run build    # Nuxt/Nitro build must succeed
```

### What's worth testing

- **Yes:** pure logic — transcript parsing, tmux output parsing, dedup/validation, config
  resolution, auth guards. These are deterministic and live in `core/` + `test/`.
- **Integration:** a tmux round-trip with `DRY_RUN` (don't launch real Claude in CI).
- **Not worth it:** the Anthropic relay, the real `claude` binary, pixel rendering, or running
  a real systemd/launchd daemon — validate generated unit/plist files instead.

## Commits & PRs

- Keep changes focused; one logical change per PR.
- Conventional, present-tense commit subjects.
- Describe what you changed and how you verified it.

## Security

Please report vulnerabilities privately — see [SECURITY.md](./SECURITY.md).

## License

By contributing you agree your contributions are licensed under the [MIT License](./LICENSE).
