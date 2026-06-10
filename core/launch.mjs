// Launch a named `claude --remote-control` session in its own tmux window.
// This is the Node port of the original `newclaude` script, plus rcId tagging
// for enrichment correlation.
import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { ensureSession, listWindows, newWindow, setWindowOption } from './tmux.mjs'
import { loadConfig, HOME } from './config.mjs'
import { writeSessionRecord } from './state.mjs'

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`
}

function resolveDir(input, fallback) {
  let dir = (input && String(input).trim()) || fallback
  if (dir === '~' || dir.startsWith('~/')) dir = path.join(HOME, dir.slice(1))
  dir = path.resolve(dir)
  let st
  try {
    st = fs.statSync(dir)
  } catch {
    throw new Error(`directory not found: ${dir}`)
  }
  if (!st.isDirectory()) throw new Error(`not a directory: ${dir}`)
  return dir
}

// tmux window names can't contain spaces/dots/colons cleanly.
function sanitizeWindowName(name) {
  return name.replace(/[ .:]/g, '_')
}

// A reliable PATH for the spawned window: a new tmux window inherits the tmux
// server's env (not ours), which is unreliable when the server was first
// started from a bare ssh command. Seed it with stable locations plus whatever
// the launching shell had, so `claude` is always found.
function windowPath() {
  const stable = [
    `${HOME}/.local/bin`,
    `${HOME}/bin`,
    '/opt/homebrew/bin',
    '/usr/local/bin',
    '/usr/bin',
    '/bin',
    '/usr/sbin',
    '/sbin',
  ]
  const fromEnv = (process.env.PATH || '').split(path.delimiter).filter(Boolean)
  return [...new Set([...stable, ...fromEnv])].join(path.delimiter)
}

export async function launchSession({ name, dir, dryRun = false } = {}) {
  name = (name || '').trim()
  if (!name) throw new Error('name is required')

  const cfg = loadConfig()
  const target = resolveDir(dir, cfg.defaultDir)
  await ensureSession(cfg.tmuxSession, HOME)

  // De-duplicate within the host session, bumping app + window names together
  // (e.g. "build" -> "build-2" / "build_2").
  const taken = new Set((await listWindows(cfg.tmuxSession)).map((w) => w.windowName))
  let appName = name
  let winName = sanitizeWindowName(name)
  let i = 2
  while (taken.has(winName)) {
    appName = `${name}-${i}`
    winName = `${sanitizeWindowName(name)}_${i}`
    i += 1
  }

  const rcId = randomUUID()
  const shell = process.env.SHELL || '/bin/bash'

  const claudeCmd = dryRun
    ? `echo ${shellQuote(`[dry-run] claude --remote-control ${appName}  (cwd ${target})`)}`
    : `claude --remote-control ${shellQuote(appName)}`
  // Hold the window open on exit so a crash stays visible (and avoids the race
  // where a fast exit closes the window before options are applied).
  const command =
    `${claudeCmd}; ec=$?; ` +
    `printf '\\n[claude-rc: session exited %s] dropping to shell\\n' "$ec"; ` +
    `exec ${shellQuote(shell)} -i`

  const env = {
    PATH: windowPath(),
    CLAUDE_RC_ID: rcId,
    CLAUDE_RC_NAME: appName,
    CLAUDE_RC_STATE_DIR: cfg.stateDir,
  }

  const windowId = await newWindow(cfg.tmuxSession, { name: winName, dir: target, env, command })

  // Stamp the rcId/name as window user-options so the server can map a live
  // window back to its enrichment record without guessing.
  try {
    await setWindowOption(windowId, '@claude_rc_id', rcId)
    await setWindowOption(windowId, '@claude_rc_name', appName)
  } catch {
    // non-fatal: enrichment join falls back to window name
  }

  await writeSessionRecord(rcId, {
    rcId,
    rcName: appName,
    windowId,
    dir: target,
    startedAt: Math.floor(Date.now() / 1000),
    status: 'active',
  })

  return { rcId, name: appName, windowName: winName, windowId, dir: target, session: cfg.tmuxSession }
}
