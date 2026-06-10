# claude-rc

**Start Claude Code sessions on your always-on machines and drive them from your phone — through Claude's own app, not a flaky bot, a browser terminal, or an SSH session.**

> **Unofficial.** claude-rc is a community tool. It is **not affiliated with, endorsed by, or supported by Anthropic.** It drives Claude Code's own `--remote-control` feature; it does not proxy your account, tokens, or login.

---

The hard part of remote coding isn't the chat — Anthropic already built an excellent mobile app
for that. The hard part is *starting and managing the sessions* on a machine that's just sitting
there. So that's all claude-rc does, and then it gets out of the way.

`claude-rc new my-feature ~/projects/app` starts a `claude --remote-control` session in a tmux
window on the machine, kept alive by an always-on service. The session appears in the **Claude
app's Code tab** on your phone, reached through Anthropic's own relay — so you get push, real chat,
and conversation sync for free. A tiny web panel (and a CLI) let you spin sessions up, see what
they're doing, and kill them, from anywhere on your tailnet.

**Why a daemon?** Because the durable value is the always-on bit. claude-rc runs as a per-machine
service, so you can start work on an idle box from your phone without being at the keyboard — the
one thing the Claude app and CLI don't do for you.

```
┌──────────────┐    tailnet     ┌────────────────────┐   spawns   ┌──────────────────────┐
│  your phone  │ ─────────────▶ │  claude-rc panel   │ ─────────▶ │ tmux: claude --remote │
│  (browser)   │   /rc over     │  (this, on devbox) │            │ -control "my-feature" │
└──────┬───────┘  tailscale     └────────────────────┘            └───────────┬───────────┘
       │                                                                       │
       │            Claude app ◀───── Anthropic relay ────────────────────────┘
       │            Code tab          (the actual session UX: chat, push, sync)
       └─────────────────────────────────────▶ you talk to the session here
```

## Why this, and not a terminal streamer

Every other way to drive an agent from your phone re-invents the *channel* and ships something
worse: a Telegram bridge that breaks and de-syncs, an xterm.js terminal wedged into a browser, or
an SSH session dying inside an iOS app. claude-rc refuses to play that game. It rides Claude Code's
**native** Remote Control relay, so the official Claude app *is* the channel — chat, push
notifications, conversation sync, all first-party. claude-rc is just a thin launcher + dashboard +
a tailnet front door.

The other tmux wrappers (cld-tmux, claunch) stop at the CLI and never touch `--remote-control`;
Codeman streams the terminal itself over a PTY. **Terminal streaming is permanently out of scope
here** — that's the whole point.

**Bonus:** because the panel rides `tailscale serve` (not SSH), you can start sessions on a machine
you've deliberately kept SSH *off* — from your phone, without being there.

## Prerequisites

- **Node.js ≥ 20** (you already have it — Claude Code installs over npm)
- **tmux**
- **[Claude Code](https://www.claude.com/product/claude-code)** ≥ 2.1.51 (for `--remote-control`)
- **[Tailscale](https://tailscale.com/)** (optional but recommended — it's the auth boundary)

## Install

```bash
npm install -g claude-rc
claude-rc setup
```

`setup` generates an auth token, installs the always-on service (a **systemd --user** unit with
linger on Linux, a **launchd** LaunchAgent on macOS), and installs the Claude Code hooks that
enrich the panel (opt out with `--no-hooks`). It prints a one-time URL — open it once to
authorise your browser.

## Quickstart

```bash
claude-rc new my-feature ~/projects/app   # launch a session in that directory
claude-rc ls                              # list sessions (status, last message, counts)
claude-rc kill my-feature                 # or: claude-rc kill @4
claude-rc rename my-feature "Auth work"   # panel display name
```

Then open the panel (the URL from `setup`/`status`) and add it to your phone's Home Screen.

## Expose on your tailnet

```bash
claude-rc expose          # tailscale serve --set-path /rc  (tailnet-only, never public)
claude-rc qr              # print a QR — scan it to authorise + open the panel on your phone
```

This serves the panel at `https://<your-host>.<tailnet>.ts.net/rc`, reachable only by your own
Tailscale devices. claude-rc **never** uses `tailscale funnel` (which would publish it to the
internet). `expose` prints a QR code; scanning it on your phone opens the panel and authorises
the device in one step (the QR encodes the one-time token link). Reprint it anytime with
`claude-rc qr`.

## Configuration

Config lives at `~/.config/claude-rc/config.json` (written by `setup`); env vars override it.

| Setting | Env | Default |
|---|---|---|
| Bind address | `CLAUDE_RC_BIND` | `127.0.0.1` |
| Port | `CLAUDE_RC_PORT` | `8765` |
| tmux session | `CLAUDE_RC_TMUX_SESSION` | `rc` |
| Mount path | `CLAUDE_RC_BASE_URL` | `/` (`/rc` after `expose`) |
| Auth token | `CLAUDE_RC_TOKEN` | generated by `setup` |
| State dir | `CLAUDE_RC_STATE_DIR` | `~/.local/state/claude-rc` |

## Enrichment (how the panel knows what a session is doing)

`setup` installs a Claude Code hook on `SessionStart` / `UserPromptSubmit` / `Stop` /
`SessionEnd`. The hook correlates to the session via an env var claude-rc sets at launch, reads
the transcript for the prompt count and last-message snippet, and writes a small per-session
JSON file (mode `0600`) that the panel watches and streams over SSE. It also pushes your chosen
name into the app as the session title. This uses Claude's **sanctioned hook mechanism** — it
never touches the live session stream.

## Security

The panel can launch sessions (and Claude can run code), and it shows message snippets, so
**reaching the panel is sensitive.** claude-rc is loopback-bound by default, exposed only via
Tailscale, and guards its API with a bearer token (set as a `SameSite=Strict` cookie). See
**[SECURITY.md](./SECURITY.md)** for the full threat model.

## Managing the service

```bash
claude-rc status      # is it running? where?
claude-rc logs        # tail service logs
claude-rc restart     # after a config change
claude-rc uninstall   # remove service + hooks
```

## How it compares

| | claude-rc | Codeman | cld-tmux / claunch |
|---|---|---|---|
| Mobile UX | **Claude's native app** | in-browser xterm.js | — (CLI only) |
| Re-implements remote access | **no** | yes (PTY stream) | no |
| Web panel | yes | yes (richer) | no |
| Footprint | thin launcher | full dashboard | shell script |

If you want a rich single-pane terminal dashboard, look at Codeman. If you want the official
Claude app experience with a lightweight launcher in front of it, that's claude-rc.

## Contributing

See **[CONTRIBUTING.md](./CONTRIBUTING.md)**. Note the one hard scope rule: **no terminal
streaming.**

## License

[MIT](./LICENSE) © Mark Fullbrook
