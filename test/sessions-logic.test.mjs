import { describe, expect, it } from 'vitest'
import { dedupeWindowName } from '../core/launch.mjs'
import { joinSessions } from '../core/sessions.mjs'

describe('dedupeWindowName', () => {
  it('leaves a free name untouched', () => {
    expect(dedupeWindowName(new Set(), 'build')).toEqual({ appName: 'build', winName: 'build' })
  })

  it('bumps app + window names together when taken', () => {
    expect(dedupeWindowName(new Set(['build']), 'build')).toEqual({
      appName: 'build-2',
      winName: 'build_2',
    })
  })

  it('keeps bumping past consecutive collisions', () => {
    expect(dedupeWindowName(new Set(['build', 'build_2']), 'build')).toEqual({
      appName: 'build-3',
      winName: 'build_3',
    })
  })

  it('sanitizes spaces/dots/colons in the window name', () => {
    expect(dedupeWindowName(new Set(['my_feature']), 'my feature')).toEqual({
      appName: 'my feature-2',
      winName: 'my_feature_2',
    })
  })

  it('accepts a plain array of taken names', () => {
    expect(dedupeWindowName(['build'], 'build')).toEqual({ appName: 'build-2', winName: 'build_2' })
  })
})

describe('joinSessions', () => {
  const windows = [
    {
      windowId: '@2',
      windowName: 'build',
      dir: '/p',
      command: 'node',
      running: true,
      activity: 200,
      rcId: 'rc-1',
      rcName: 'build',
    },
    {
      windowId: '@3',
      windowName: 'notes',
      dir: '/n',
      command: 'zsh',
      running: false,
      activity: 300,
      rcId: null,
      rcName: null,
    },
    {
      windowId: '@4',
      windowName: 'orphan_win',
      dir: '/o',
      command: 'zsh',
      running: false,
      activity: 50,
      rcId: 'rc-x',
      rcName: 'orphan',
    },
  ]
  const records = {
    'rc-1': { rcId: 'rc-1', displayName: 'My Build', messageCount: 5, updatedAt: 1000, title: 't' },
  }

  it('uses the panel display name and exposes enrichment when a record matches', () => {
    const s = joinSessions(windows, records).find((x) => x.id === '@2')
    expect(s.name).toBe('My Build')
    expect(s.appName).toBe('build')
    expect(s.enrichment.messageCount).toBe(5)
    expect(s.enrichment.title).toBe('t')
  })

  it('falls back to window name and null enrichment when there is no rcId', () => {
    const s = joinSessions(windows, records).find((x) => x.id === '@3')
    expect(s.name).toBe('notes')
    expect(s.enrichment).toBeNull()
  })

  it('falls back to rcName (not display name) when a window has an rcId but no record', () => {
    const s = joinSessions(windows, records).find((x) => x.id === '@4')
    expect(s.name).toBe('orphan')
    expect(s.enrichment).toBeNull()
  })

  it('sorts most-recently-active first (hook updatedAt beats raw tmux activity)', () => {
    const s = joinSessions(windows, records)
    expect(s[0].id).toBe('@2') // updatedAt 1000 outranks notes activity 300
  })
})
