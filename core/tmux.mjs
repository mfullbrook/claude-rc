// Thin tmux wrapper. Every call uses execFile with an argument array — never a
// shell string — so session names and directories can't inject commands.
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const pexec = promisify(execFile)
const TMUX = process.env.CLAUDE_RC_TMUX_BIN || 'tmux'

// Shells we treat as "idle": the window has dropped back to a prompt because
// the claude session ended. Anything else running => "running".
const IDLE_COMMANDS = new Set(['zsh', '-zsh', 'bash', '-bash', 'sh', '-sh', 'fish', '-fish'])
const PLACEHOLDER_WINDOW = '__home'

const FIELDS = [
  '#{window_id}',
  '#{window_name}',
  '#{pane_current_path}',
  '#{pane_current_command}',
  '#{window_activity}',
  '#{@claude_rc_id}',
  '#{@claude_rc_name}',
]
const FORMAT = FIELDS.join('\t')

export async function tmux(args, opts = {}) {
  return pexec(TMUX, args, { timeout: 5000, ...opts })
}

export async function hasSession(session) {
  try {
    await tmux(['has-session', '-t', `=${session}`])
    return true
  } catch {
    return false
  }
}

export async function ensureSession(session, home) {
  if (!(await hasSession(session))) {
    await tmux(['new-session', '-d', '-s', session, '-n', PLACEHOLDER_WINDOW, '-c', home])
  }
}

// Pure parser for `tmux list-windows -F <FORMAT>` output (exported for tests).
export function parseWindowList(stdout) {
  const rows = []
  for (const line of String(stdout).split('\n')) {
    if (!line) continue
    const p = line.split('\t')
    if (p.length < 5) continue
    const [windowId, windowName, dir, command, activity, rcId = '', rcName = ''] = p
    if (windowName === PLACEHOLDER_WINDOW) continue
    rows.push({
      windowId,
      windowName,
      dir,
      command,
      running: !IDLE_COMMANDS.has(command),
      activity: /^\d+$/.test(activity) ? Number.parseInt(activity, 10) : 0,
      rcId: rcId || null,
      rcName: rcName || null,
    })
  }
  return rows
}

export async function listWindows(session) {
  let out
  try {
    out = await tmux(['list-windows', '-t', `=${session}`, '-F', FORMAT])
  } catch {
    // No such session yet just means nothing is running.
    return []
  }
  return parseWindowList(out.stdout)
}

export async function setWindowOption(target, key, value) {
  await tmux(['set-option', '-w', '-t', target, key, value])
}

export async function newWindow(session, { name, dir, env = {}, command }) {
  const args = [
    'new-window',
    '-P',
    '-F',
    '#{window_id}',
    '-t',
    `=${session}`,
    '-n',
    name,
    '-c',
    dir,
  ]
  for (const [k, v] of Object.entries(env)) {
    args.push('-e', `${k}=${v}`)
  }
  args.push(command)
  const out = await tmux(args)
  return out.stdout.trim()
}

export function isValidWindowId(target) {
  return typeof target === 'string' && /^@\d+$/.test(target)
}

export async function killWindow(target) {
  if (!isValidWindowId(target)) throw new Error('invalid window id')
  await tmux(['kill-window', '-t', target])
}
