import { bold, dim } from './util.mjs'

export function run() {
  console.log(`${bold('claude-rc')} — manage Claude Code Remote Control sessions

${dim('Usage:')} claude-rc <command> [args]

${bold('Sessions')}
  new <name> [dir]            Launch a Remote Control session in a new tmux window
  ls                          List sessions
  kill <name|@id>             Kill a session
  rename <name|@id> <label>   Set a panel display name for a session

${bold('Server / service')}
  serve                       Run the web panel server in the foreground
  setup [--no-hooks]          Install the always-on service + Claude Code hooks
  expose                      Expose the panel on your tailnet (tailscale serve)
  status                      Show service status
  logs                        Tail service logs
  restart                     Restart the service
  uninstall                   Remove the service + hooks

${bold('Other')}
  help, --help                Show this help
  version, --version          Show version

${dim('The panel rides Claude’s native Remote Control relay — sessions appear in the')}
${dim('Claude app’s Code tab. This is an unofficial tool, not affiliated with Anthropic.')}`)
}
