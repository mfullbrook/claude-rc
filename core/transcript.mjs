// Tolerant parse of a Claude Code transcript (JSONL) for enrichment. The schema
// varies across Claude Code versions, so read defensively and never throw on a
// malformed line — partial data beats a crashed hook.
import fs from 'node:fs'

function extractText(content) {
  if (typeof content === 'string') return content.trim()
  if (Array.isArray(content)) {
    return content
      .filter((b) => b && (b.type === 'text' || typeof b.text === 'string'))
      .map((b) => b.text || '')
      .join(' ')
      .trim()
  }
  return ''
}

function clip(s, n) {
  const c = String(s).replace(/\s+/g, ' ').trim()
  return c.length > n ? `${c.slice(0, n - 1)}…` : c
}

export function parseTranscript(transcriptPath, { snippet = 280 } = {}) {
  let raw
  try {
    raw = fs.readFileSync(transcriptPath, 'utf8')
  } catch {
    return { messageCount: null, lastMessage: null, lastRole: null, title: null }
  }

  let messageCount = 0
  let lastMessage = null
  let lastRole = null
  let title = null

  for (const line of raw.split('\n')) {
    if (!line.trim()) continue
    let o
    try {
      o = JSON.parse(line)
    } catch {
      continue
    }
    if (typeof o.title === 'string' && o.title) title = o.title
    const msg = o.message || o
    const role = msg.role || o.type
    if (role !== 'user' && role !== 'assistant') continue
    const text = extractText(msg.content)
    // Count genuine user prompts: a user entry with extractable text. Tool
    // results also arrive as user entries but carry no text, so they're
    // excluded — the number reads as "exchanges", not raw transcript lines.
    if (role === 'user' && text) {
      messageCount += 1
    }
    if (text) {
      lastMessage = clip(text, snippet)
      lastRole = role
    }
  }

  return { messageCount, lastMessage, lastRole, title }
}
