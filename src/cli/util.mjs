// Tiny terminal helpers — no dependencies. Colour only when stdout is a TTY.
import process from 'node:process'
import path from 'node:path'
import { existsSync } from 'node:fs'

// Minimal cross-platform `which`: first match on PATH.
export function which(bin) {
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    if (dir && existsSync(path.join(dir, bin))) return path.join(dir, bin)
  }
  return null
}

const useColor = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR

const CODES = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
}

function paint(name, s) {
  return useColor ? CODES[name] + s + CODES.reset : String(s)
}

export const dim = (s) => paint('dim', s)
export const bold = (s) => paint('bold', s)
export const green = (s) => paint('green', s)
export const red = (s) => paint('red', s)
export const yellow = (s) => paint('yellow', s)
export const cyan = (s) => paint('cyan', s)

export function timeAgo(epoch) {
  if (!epoch) return ''
  const s = Math.max(0, Math.floor(Date.now() / 1000) - epoch)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export function homeShort(p) {
  const home = process.env.HOME || ''
  return home && p.startsWith(home) ? '~' + p.slice(home.length) : p
}

export function truncate(s, n) {
  const clean = String(s).replace(/\s+/g, ' ').trim()
  return clean.length > n ? clean.slice(0, n - 1) + '…' : clean
}

export function fail(msg) {
  console.error(red('error: ') + msg)
  process.exitCode = 1
}
