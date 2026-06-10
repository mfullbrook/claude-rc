#!/usr/bin/env node
// claude-rc — CLI dispatcher. Subcommands are lazy-loaded so a single command
// only pays for what it imports, and the CLI runs straight from source (no build).
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const [cmd, ...args] = process.argv.slice(2)

const COMMANDS = {
  new: 'new',
  ls: 'ls',
  list: 'ls',
  kill: 'kill',
  rename: 'rename',
  serve: 'serve',
  setup: 'setup',
  expose: 'expose',
  status: 'status',
  logs: 'logs',
  restart: 'restart',
  uninstall: 'uninstall',
}

async function main() {
  if (!cmd || ['help', '--help', '-h'].includes(cmd)) {
    const { run } = await import('../src/cli/help.mjs')
    return run()
  }
  if (['version', '--version', '-v'].includes(cmd)) {
    const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
    return console.log(pkg.version)
  }

  const mod = COMMANDS[cmd]
  if (!mod) {
    console.error(`unknown command: ${cmd}\nrun 'claude-rc help' for usage`)
    process.exitCode = 1
    return
  }

  try {
    const handler = await import(`../src/cli/${mod}.mjs`)
    await handler.run(args)
  } catch (e) {
    if (e && e.code === 'ERR_MODULE_NOT_FOUND') {
      console.error(`'${cmd}' is not available yet in this build`)
    } else {
      console.error('error:', e?.stack || e?.message || e)
    }
    process.exitCode = 1
  }
}

main()
