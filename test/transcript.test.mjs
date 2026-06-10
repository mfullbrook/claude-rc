import { rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { parseTranscript } from '../core/transcript.mjs'

const fixture = path.join(tmpdir(), `crc-tx-${process.pid}.jsonl`)

beforeAll(() => {
  writeFileSync(
    fixture,
    [
      JSON.stringify({ type: 'user', promptId: 'p1', message: { role: 'user', content: 'hello' } }),
      JSON.stringify({
        type: 'assistant',
        message: { role: 'assistant', content: [{ type: 'thinking', thinking: 'x' }] },
      }),
      JSON.stringify({
        type: 'assistant',
        message: { role: 'assistant', content: [{ type: 'text', text: 'Hi there' }] },
      }),
      JSON.stringify({
        type: 'assistant',
        message: { role: 'assistant', content: [{ type: 'tool_use', name: 'Bash', input: {} }] },
      }),
      JSON.stringify({
        type: 'user',
        message: { role: 'user', content: [{ type: 'tool_result', content: 'ok' }] },
      }),
      JSON.stringify({
        type: 'user',
        promptId: 'p2',
        message: { role: 'user', content: 'build it' },
      }),
      'not json at all',
    ].join('\n'),
  )
})

afterAll(() => rmSync(fixture, { force: true }))

describe('parseTranscript', () => {
  it('counts genuine user prompts, not tool results or assistant lines', () => {
    expect(parseTranscript(fixture).messageCount).toBe(2)
  })

  it('reports the last textual message and its role', () => {
    const r = parseTranscript(fixture)
    expect(r.lastMessage).toBe('build it')
    expect(r.lastRole).toBe('user')
  })

  it('returns nulls for a missing file', () => {
    const r = parseTranscript('/no/such/file.jsonl')
    expect(r.messageCount).toBeNull()
    expect(r.lastMessage).toBeNull()
  })
})
