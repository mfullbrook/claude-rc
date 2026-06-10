import { describe, expect, it } from 'vitest'
import { isLoopback, loadConfig } from '../core/config.mjs'

describe('isLoopback', () => {
  it('recognises loopback addresses', () => {
    expect(isLoopback('127.0.0.1')).toBe(true)
    expect(isLoopback('::1')).toBe(true)
    expect(isLoopback('localhost')).toBe(true)
  })

  it('rejects routable addresses', () => {
    expect(isLoopback('0.0.0.0')).toBe(false)
    expect(isLoopback('100.126.201.12')).toBe(false)
  })
})

describe('loadConfig', () => {
  it('reads CLAUDE_RC_* env over defaults', () => {
    const prev = { ...process.env }
    process.env.CLAUDE_RC_PORT = '9999'
    process.env.CLAUDE_RC_TMUX_SESSION = 'xyz'
    process.env.CLAUDE_RC_TOKEN = 'tok'
    try {
      const c = loadConfig()
      expect(c.port).toBe(9999)
      expect(c.tmuxSession).toBe('xyz')
      expect(c.token).toBe('tok')
    } finally {
      process.env = prev
    }
  })
})
