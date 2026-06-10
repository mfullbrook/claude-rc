import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadConfig } from '../../core/config.mjs'
import { fail, dim } from './util.mjs'

// Package root = two levels up from src/cli/serve.mjs.
function packageRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
}

export async function run() {
  const cfg = loadConfig()
  const entry = path.join(packageRoot(), '.output', 'server', 'index.mjs')
  if (!existsSync(entry)) {
    return fail(`server build not found at ${entry}\n  build it first:  npm run build`)
  }

  const env = {
    ...process.env,
    HOST: cfg.bind,
    NITRO_HOST: cfg.bind,
    PORT: String(cfg.port),
    NITRO_PORT: String(cfg.port),
    CLAUDE_RC_TMUX_SESSION: cfg.tmuxSession,
    CLAUDE_RC_STATE_DIR: cfg.stateDir,
    CLAUDE_RC_TOKEN: cfg.token,
    CLAUDE_RC_BASE_URL: cfg.baseUrl,
  }

  console.log(dim(`claude-rc serve → http://${cfg.bind}:${cfg.port}  (tmux '${cfg.tmuxSession}')`))
  const child = spawn(process.execPath, [entry], { env, stdio: 'inherit' })
  child.on('exit', (code) => process.exit(code ?? 0))
}
