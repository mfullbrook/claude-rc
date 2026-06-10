// Unify the two sources of truth into the shape the panel consumes:
//   - tmux windows  -> authoritative for "what is alive" (and running/idle)
//   - state records -> enrichment written by the launcher + the Claude hook
// They are joined on the rcId stamped onto each window as a user-option.
import { loadConfig } from './config.mjs'
import { readAllSessionRecords, removeSessionRecord, writeSessionRecord } from './state.mjs'
import { killWindow, listWindows } from './tmux.mjs'

// Pure join of live tmux windows with their enrichment records (no I/O, so it's
// unit-testable). Returns the panel-facing session list, most-recent first.
/**
 * @param {import('./types.mjs').TmuxWindow[]} windows
 * @param {Record<string, import('./types.mjs').SessionRecord>} records
 */
export function joinSessions(windows, records) {
  const sessions = windows.map((w) => {
    const rec = (w.rcId && records[w.rcId]) || null
    return {
      id: w.windowId,
      rcId: w.rcId,
      name: rec?.displayName || w.rcName || w.windowName,
      appName: w.rcName || w.windowName,
      dir: w.dir,
      command: w.command,
      running: w.running,
      activity: w.activity,
      enrichment: rec
        ? {
            title: rec.title ?? null,
            model: rec.model ?? null,
            messageCount: rec.messageCount ?? null,
            lastMessage: rec.lastMessage ?? null,
            lastRole: rec.lastRole ?? null,
            updatedAt: rec.updatedAt ?? null,
            claudeSessionId: rec.claudeSessionId ?? null,
            status: rec.status ?? null,
          }
        : null,
    }
  })

  // Most recently active first: prefer hook updated-time, fall back to tmux.
  sessions.sort((a, b) => {
    const av = a.enrichment?.updatedAt || a.activity || 0
    const bv = b.enrichment?.updatedAt || b.activity || 0
    return bv - av
  })

  return sessions
}

export async function listSessions() {
  const cfg = loadConfig()
  const [windows, records] = await Promise.all([
    listWindows(cfg.tmuxSession),
    readAllSessionRecords(),
  ])
  return { sessions: joinSessions(windows, records) }
}

// Find the rcId for a live window, if it carries one.
export async function rcIdForWindow(windowId) {
  const cfg = loadConfig()
  const win = (await listWindows(cfg.tmuxSession)).find((w) => w.windowId === windowId)
  return win?.rcId || null
}

export async function killSession(windowId) {
  const rcId = await rcIdForWindow(windowId)
  await killWindow(windowId)
  // The window is gone, so its record is now orphaned and invisible to the
  // panel (which lists live windows). Delete it rather than leaving dead files
  // that every /api/sessions call and every SSE poll re-reads forever.
  if (rcId) {
    await removeSessionRecord(rcId).catch(() => {})
  }
  return { rcId }
}

export async function renameSession(rcId, displayName) {
  const name = (displayName || '').trim()
  if (!rcId) throw new Error('rcId is required')
  await writeSessionRecord(rcId, { displayName: name || undefined })
  return { rcId, displayName: name }
}
