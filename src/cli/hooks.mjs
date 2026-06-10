// Install/remove the claude-rc hook in the user's Claude Code settings,
// idempotently and without clobbering other hooks. Our entries are identified
// by the hook script filename in their command.

import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { hookPath } from './platform.mjs'

const EVENTS = ['SessionStart', 'UserPromptSubmit', 'Stop', 'SessionEnd']
const MARKER = 'claude-rc-hook.mjs'

export function claudeSettingsPath() {
  return path.join(os.homedir(), '.claude', 'settings.json')
}

function hookCommand() {
  return `"${process.execPath}" "${hookPath()}"`
}

function isOurs(entry) {
  return entry && typeof entry.command === 'string' && entry.command.includes(MARKER)
}

async function readSettings() {
  try {
    return JSON.parse(await fsp.readFile(claudeSettingsPath(), 'utf8'))
  } catch {
    return {}
  }
}

async function writeSettings(obj) {
  const p = claudeSettingsPath()
  await fsp.mkdir(path.dirname(p), { recursive: true })
  await fsp.writeFile(p, `${JSON.stringify(obj, null, 2)}\n`)
}

export async function installClaudeHooks() {
  const settings = await readSettings()
  settings.hooks = settings.hooks || {}
  const command = hookCommand()
  let added = 0
  for (const ev of EVENTS) {
    const groups = Array.isArray(settings.hooks[ev]) ? settings.hooks[ev] : []
    const present = groups.some((g) => Array.isArray(g?.hooks) && g.hooks.some(isOurs))
    if (!present) {
      groups.push({ hooks: [{ type: 'command', command }] })
      added += 1
    }
    settings.hooks[ev] = groups
  }
  await writeSettings(settings)
  return { added, events: EVENTS }
}

export async function removeClaudeHooks() {
  const settings = await readSettings()
  if (!settings.hooks) return { removed: 0 }
  let removed = 0
  for (const ev of Object.keys(settings.hooks)) {
    const groups = Array.isArray(settings.hooks[ev]) ? settings.hooks[ev] : []
    const kept = []
    for (const g of groups) {
      if (Array.isArray(g?.hooks)) {
        const before = g.hooks.length
        g.hooks = g.hooks.filter((h) => !isOurs(h))
        removed += before - g.hooks.length
        if (g.hooks.length === 0) continue // drop a group we emptied
      }
      kept.push(g)
    }
    if (kept.length) settings.hooks[ev] = kept
    else delete settings.hooks[ev]
  }
  if (Object.keys(settings.hooks).length === 0) delete settings.hooks
  await writeSettings(settings)
  return { removed }
}
