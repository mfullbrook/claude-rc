// Single shared source of truth for the SSE stream. One poller + one state-dir
// watcher serve every connected client, so N open tabs cost ~1 tmux poll, not N.
import { watch, mkdirSync } from 'node:fs'
import { listSessions } from '../../core/sessions.mjs'
import { sessionsDir } from '../../core/config.mjs'

type PushTarget = { push: (data: string) => unknown }

const streams = new Set<PushTarget>()
let started = false
let last = ''
let timer: ReturnType<typeof setInterval> | null = null

async function snapshot(): Promise<string> {
  try {
    return JSON.stringify(await listSessions())
  } catch {
    return '{"sessions":[]}'
  }
}

async function tick() {
  const json = await snapshot()
  if (json === last) return
  last = json
  for (const s of streams) {
    try {
      s.push(json)
    } catch {
      // a dead stream will be pruned on its own onClosed
    }
  }
}

function start() {
  if (started) return
  started = true
  // Periodic poll catches tmux-only changes (new/killed windows, run<->idle).
  timer = setInterval(() => void tick(), 2000)
  // Don't keep the process alive just for the poller.
  if (typeof timer.unref === 'function') timer.unref()
  // File watch makes hook enrichment updates near-instant.
  try {
    mkdirSync(sessionsDir(), { recursive: true })
    watch(sessionsDir(), () => void tick())
  } catch {
    // watching is best-effort; the poller still covers us
  }
}

export const sessionHub = {
  async addStream(stream: PushTarget) {
    start()
    streams.add(stream)
    // Send the current snapshot immediately so a freshly opened/refocused tab
    // is correct without waiting for the next change.
    if (!last) last = await snapshot()
    try {
      stream.push(last)
    } catch {
      // ignore
    }
  },
  removeStream(stream: PushTarget) {
    streams.delete(stream)
  },
}
