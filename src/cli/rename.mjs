import { listSessions, renameSession } from '../../core/sessions.mjs'
import { green, fail } from './util.mjs'

export async function run(args) {
  const [target, ...rest] = args
  const label = rest.join(' ').trim()
  if (!target || !label) {
    console.log('usage: claude-rc rename <name|@id> <new-display-name>')
    return
  }

  const { sessions } = await listSessions()
  const matches = sessions.filter(
    (s) => s.id === target || s.name === target || s.appName === target,
  )
  if (matches.length === 0) return fail(`no session matching '${target}'`)
  if (matches.length > 1) return fail(`'${target}' is ambiguous — use the @id`)
  if (!matches[0].rcId) {
    return fail('this session was not launched by claude-rc, so it has no record to rename')
  }

  await renameSession(matches[0].rcId, label)
  console.log(`${green('✓')} renamed to ${green(label)}`)
}
