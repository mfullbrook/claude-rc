import { uninstallService } from './platform.mjs'
import { removeClaudeHooks } from './hooks.mjs'
import { green, dim } from './util.mjs'

export async function run(args) {
  const keepHooks = args.includes('--keep-hooks')

  await uninstallService()
  console.log(`${green('✓')} service removed`)

  if (keepHooks) {
    console.log(dim('• Claude Code hooks kept (--keep-hooks)'))
  } else {
    const r = await removeClaudeHooks()
    console.log(`${green('✓')} Claude Code hooks removed ${dim(`(${r.removed})`)}`)
  }

  console.log(dim('config left at ~/.config/claude-rc/config.json — delete it manually if you want a clean slate'))
}
