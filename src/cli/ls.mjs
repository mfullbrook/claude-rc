import { listSessions } from '../../core/sessions.mjs'
import { homeShort, timeAgo, truncate, green, dim, bold } from './util.mjs'

export async function run() {
  const { sessions } = await listSessions()
  if (!sessions.length) {
    console.log(dim('No sessions running.'))
    return
  }
  for (const s of sessions) {
    const dot = s.running ? green('●') : dim('○')
    const status = s.running ? 'running' : 'idle'
    const e = s.enrichment
    const bits = []
    const when = e?.updatedAt || s.activity
    if (when) bits.push(timeAgo(when))
    if (e?.messageCount != null) bits.push(`${e.messageCount} msg${e.messageCount === 1 ? '' : 's'}`)
    const meta = bits.length ? dim('  ' + bits.join(' · ')) : ''
    console.log(`${dot} ${bold(pad(s.name, 18))} ${dim(pad(homeShort(s.dir), 28))} ${status}${meta}`)
    if (e?.lastMessage) console.log(dim(`    ${truncate(e.lastMessage, 72)}`))
  }
}

function pad(s, n) {
  s = String(s)
  return s.length >= n ? s : s + ' '.repeat(n - s.length)
}
