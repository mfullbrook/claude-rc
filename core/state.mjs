// Per-session enrichment state. Each session is one JSON file under
// $stateDir/sessions/<rcId>.json, written atomically with 0600 perms because it
// can hold a snippet of conversation content. The launcher creates the record;
// the Claude Code hook merges enrichment into the same file (keyed by the rcId
// it inherits via the CLAUDE_RC_ID env var).
import fsp from 'node:fs/promises'
import path from 'node:path'
import { sessionsDir, stateDir } from './config.mjs'

export async function ensureStateDirs() {
  await fsp.mkdir(sessionsDir(), { recursive: true })
  // Best-effort tighten: the dir tree is private to the user.
  await fsp.chmod(stateDir(), 0o700).catch(() => {})
  await fsp.chmod(sessionsDir(), 0o700).catch(() => {})
}

function fileFor(rcId) {
  if (!/^[A-Za-z0-9._-]+$/.test(rcId)) throw new Error('invalid rcId')
  return path.join(sessionsDir(), `${rcId}.json`)
}

export async function readSessionRecord(rcId) {
  try {
    return JSON.parse(await fsp.readFile(fileFor(rcId), 'utf8'))
  } catch {
    return null
  }
}

/**
 * @param {string} rcId
 * @param {Partial<import('./types.mjs').SessionRecord>} patch
 */
export async function writeSessionRecord(rcId, patch) {
  await ensureStateDirs()
  const file = fileFor(rcId)
  let current = {}
  try {
    current = JSON.parse(await fsp.readFile(file, 'utf8'))
  } catch {
    // new record
  }
  const next = { ...current, ...patch }
  const tmp = `${file}.tmp${process.pid}`
  await fsp.writeFile(tmp, JSON.stringify(next), { mode: 0o600 })
  await fsp.rename(tmp, file)
  return next
}

export async function removeSessionRecord(rcId) {
  try {
    await fsp.unlink(fileFor(rcId))
  } catch {
    // already gone
  }
}

export async function readAllSessionRecords() {
  let names
  try {
    names = await fsp.readdir(sessionsDir())
  } catch {
    return {}
  }
  const records = {}
  await Promise.all(
    names
      .filter((n) => n.endsWith('.json'))
      .map(async (n) => {
        try {
          const rec = JSON.parse(await fsp.readFile(path.join(sessionsDir(), n), 'utf8'))
          if (rec?.rcId) records[rec.rcId] = rec
        } catch {
          // skip unreadable / partial files
        }
      }),
  )
  return records
}
