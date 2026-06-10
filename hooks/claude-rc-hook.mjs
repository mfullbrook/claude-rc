#!/usr/bin/env node
// Claude Code hook for claude-rc. `claude-rc setup` registers it on
// SessionStart / UserPromptSubmit / Stop / SessionEnd. It:
//   - correlates to a launched session via the inherited CLAUDE_RC_ID env var
//   - enriches the per-session state file (count, last message, model, title)
//   - at SessionStart, pushes the panel-chosen name as the session title
// It must never disrupt the session, so every failure path exits 0.
import path from 'node:path'
import { fileURLToPath } from 'node:url'

async function readStdin() {
  if (process.stdin.isTTY) return ''
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}

async function main() {
  const rcId = process.env.CLAUDE_RC_ID
  if (!rcId) return // not a claude-rc-launched session — do nothing

  const here = path.dirname(fileURLToPath(import.meta.url))
  const { writeSessionRecord } = await import(path.join(here, '..', 'core', 'state.mjs'))
  const { parseTranscript } = await import(path.join(here, '..', 'core', 'transcript.mjs'))

  let payload = {}
  try {
    payload = JSON.parse((await readStdin()) || '{}')
  } catch {
    payload = {}
  }

  const event = payload.hook_event_name || ''
  const now = Math.floor(Date.now() / 1000)

  const patch = { rcId, updatedAt: now }
  if (process.env.CLAUDE_RC_NAME) patch.rcName = process.env.CLAUDE_RC_NAME
  if (payload.session_id) patch.claudeSessionId = payload.session_id

  if (event === 'SessionStart') {
    if (payload.model) patch.model = payload.model
    if (payload.session_title) patch.title = payload.session_title
    patch.status = 'active'
  } else if (event === 'SessionEnd') {
    patch.status = 'ended'
    patch.endedAt = now
  } else {
    patch.status = 'active'
  }

  if (payload.transcript_path) {
    const t = parseTranscript(payload.transcript_path)
    if (t.messageCount != null) patch.messageCount = t.messageCount
    if (t.lastMessage) patch.lastMessage = t.lastMessage
    if (t.lastRole) patch.lastRole = t.lastRole
    if (t.title && !patch.title) patch.title = t.title
  }

  try {
    await writeSessionRecord(rcId, patch)
  } catch {
    // swallow — enrichment is best-effort
  }

  // Push our launch name as the session title only when none is set, so we
  // never clobber a rename the user made in the Claude app.
  if (event === 'SessionStart' && !payload.session_title && process.env.CLAUDE_RC_NAME) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'SessionStart',
          sessionTitle: process.env.CLAUDE_RC_NAME,
        },
      }),
    )
  }
}

main().then(
  () => process.exit(0),
  () => process.exit(0), // fail open
)
