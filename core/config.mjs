// Configuration resolution shared by the CLI and the Nitro server.
//
// Precedence: explicit env var > config file > built-in default. The config
// file (written by `claude-rc setup`) lives at $XDG_CONFIG_HOME/claude-rc/
// config.json and holds the generated auth token, port, etc.
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

export const HOME = os.homedir()

export function xdgStateHome() {
  return process.env.XDG_STATE_HOME || path.join(HOME, '.local', 'state')
}

export function xdgConfigHome() {
  return process.env.XDG_CONFIG_HOME || path.join(HOME, '.config')
}

export function configPath() {
  return path.join(xdgConfigHome(), 'claude-rc', 'config.json')
}

export function stateDir() {
  return process.env.CLAUDE_RC_STATE_DIR || path.join(xdgStateHome(), 'claude-rc')
}

export function sessionsDir() {
  return path.join(stateDir(), 'sessions')
}

function readConfigFile() {
  try {
    return JSON.parse(fs.readFileSync(configPath(), 'utf8'))
  } catch {
    return {}
  }
}

function toInt(value, fallback) {
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) ? n : fallback
}

export function loadConfig() {
  const file = readConfigFile()
  return {
    tmuxSession: process.env.CLAUDE_RC_TMUX_SESSION || file.tmuxSession || 'rc',
    bind: process.env.CLAUDE_RC_BIND || file.bind || '127.0.0.1',
    port: toInt(process.env.CLAUDE_RC_PORT, toInt(file.port, 8765)),
    token: process.env.CLAUDE_RC_TOKEN || file.token || '',
    defaultDir: process.env.CLAUDE_RC_DEFAULT_DIR || file.defaultDir || HOME,
    baseUrl: process.env.CLAUDE_RC_BASE_URL || file.baseUrl || '/',
    stateDir: stateDir(),
    home: HOME,
  }
}

// A loopback bind needs no extra auth to be safe from the network; any other
// bind exposes the panel and must be gated (see the server auth middleware).
export function isLoopback(bind) {
  return bind === '127.0.0.1' || bind === '::1' || bind === 'localhost'
}
