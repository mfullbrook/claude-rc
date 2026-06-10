import { launchSession } from '../../core/launch.mjs'
import { homeShort, green, dim, fail } from './util.mjs'

export async function run(args) {
  let dryRun = false
  const positional = []
  for (const a of args) {
    if (a === '--dry-run' || a === '-n') dryRun = true
    else if (a === '-h' || a === '--help') return usage()
    else positional.push(a)
  }
  const [name, dir] = positional
  if (!name) return usage()

  try {
    const r = await launchSession({ name, dir, dryRun })
    console.log(`${green('✓')} launched ${green(r.name)}`)
    console.log(dim(`  tmux:  ${r.session} (${r.windowId}, window '${r.windowName}')`))
    console.log(dim(`  dir:   ${homeShort(r.dir)}`))
    console.log(dim(`  phone: Claude app → Code tab → '${r.name}'  (appears within a few seconds)`))
  } catch (e) {
    fail(e.message)
  }
}

function usage() {
  console.log('usage: claude-rc new <name> [dir] [--dry-run]')
}
