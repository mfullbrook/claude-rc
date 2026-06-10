import { describe, expect, it } from 'vitest'
import { isValidWindowId, parseWindowList } from '../core/tmux.mjs'

const row = (cells) => cells.join('\t')
const sample = [
  row(['@1', '__home', '/home/u', 'zsh', '100', '', '']),
  row(['@2', 'build', '/home/u/p', 'node', '200', 'rc-1', 'build']),
  row(['@3', 'notes', '/home/u/n', 'zsh', '150', 'rc-2', 'notes']),
].join('\n')

describe('parseWindowList', () => {
  it('excludes the placeholder window', () => {
    const r = parseWindowList(sample)
    expect(r.find((w) => w.windowName === '__home')).toBeUndefined()
    expect(r).toHaveLength(2)
  })

  it('marks running vs idle by current command', () => {
    const r = parseWindowList(sample)
    expect(r.find((w) => w.windowId === '@2').running).toBe(true)
    expect(r.find((w) => w.windowId === '@3').running).toBe(false)
  })

  it('parses rcId/rcName from window options', () => {
    const w = parseWindowList(sample).find((x) => x.windowId === '@2')
    expect(w.rcId).toBe('rc-1')
    expect(w.rcName).toBe('build')
  })

  it('tolerates blank and short lines', () => {
    expect(parseWindowList('\n\nbad\n')).toEqual([])
  })
})

describe('isValidWindowId', () => {
  it('accepts @N', () => {
    expect(isValidWindowId('@12')).toBe(true)
  })

  it('rejects anything else (incl. injection attempts)', () => {
    expect(isValidWindowId('12')).toBe(false)
    expect(isValidWindowId('@a')).toBe(false)
    expect(isValidWindowId('@1; rm -rf /')).toBe(false)
    expect(isValidWindowId(undefined)).toBe(false)
  })
})
