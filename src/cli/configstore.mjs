// Read/write the on-disk config (token, port, bind, etc.) that `setup` creates
// and `serve` consumes. Kept separate from core/config.mjs (which is read-only
// resolution shared with the server) so the server bundle stays write-free.

import crypto from 'node:crypto'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { configPath } from '../../core/config.mjs'

export async function readStore() {
  try {
    return JSON.parse(await fsp.readFile(configPath(), 'utf8'))
  } catch {
    return {}
  }
}

export async function writeStore(patch) {
  const next = { ...(await readStore()), ...patch }
  await fsp.mkdir(path.dirname(configPath()), { recursive: true })
  await fsp.writeFile(configPath(), `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
  return next
}

export function newToken() {
  return crypto.randomBytes(24).toString('base64url')
}
