import { listSessions, killSession } from '../../core/sessions.mjs'
import { isValidWindowId } from '../../core/tmux.mjs'
import { green, fail } from './util.mjs'

export async function run(args) {
  const target = args[0]
  if (!target) {
    console.log('usage: claude-rc kill <name|@id>')
    return
  }

  let windowId = null
  if (isValidWindowId(target)) {
    windowId = target
  } else {
    const { sessions } = await listSessions()
    const matches = sessions.filter(
      (s) => s.name === target || s.appName === target || s.id === target,
    )
    if (matches.length === 0) return fail(`no session matching '${target}'`)
    if (matches.length > 1) {
      return fail(`'${target}' matches ${matches.length} sessions — kill by id: ` + matches.map((m) => m.id).join(' '))
    }
    windowId = matches[0].id
  }

  try {
    await killSession(windowId)
    console.log(`${green('✓')} killed ${target}`)
  } catch (e) {
    fail(e.message)
  }
}
