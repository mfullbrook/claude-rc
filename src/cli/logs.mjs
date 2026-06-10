import { spawn } from 'node:child_process'
import { logsCommand } from './platform.mjs'
import { fail } from './util.mjs'

export async function run() {
  const c = logsCommand()
  if (!c) return fail('logs are not supported on this platform')
  const [cmd, args] = c
  const child = spawn(cmd, args, { stdio: 'inherit' })
  child.on('exit', (code) => process.exit(code ?? 0))
}
