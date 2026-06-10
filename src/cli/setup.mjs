import { loadConfig } from '../../core/config.mjs'
import { readStore, writeStore, newToken } from './configstore.mjs'
import { installService, isBuilt, serverEntry, PLATFORM } from './platform.mjs'
import { installClaudeHooks } from './hooks.mjs'
import { which, green, yellow, red, dim, bold } from './util.mjs'

export async function run(args) {
  const noHooks = args.includes('--no-hooks')
  console.log(bold('claude-rc setup'))

  // 1. Prerequisites
  const tmux = which('tmux')
  if (!tmux) {
    console.log(red('✗') + ' tmux not found — install it first (apt install tmux / brew install tmux)')
    process.exitCode = 1
    return
  }
  console.log(`${green('✓')} tmux ${dim(tmux)}`)
  const claude = which('claude')
  if (claude) console.log(`${green('✓')} claude ${dim(claude)}`)
  else console.log(`${yellow('⚠')} claude not on PATH — install Claude Code before launching sessions`)

  // 2. Config + token (generated once, then preserved)
  const store = await readStore()
  const patch = {
    port: store.port || 8765,
    bind: store.bind || '127.0.0.1',
    tmuxSession: store.tmuxSession || 'rc',
    baseUrl: store.baseUrl || '/',
  }
  if (!store.token) patch.token = newToken()
  await writeStore(patch)
  console.log(`${green('✓')} config written ${dim(`(token ${store.token ? 'kept' : 'generated'})`)}`)

  // 3. Build present?
  if (!isBuilt()) {
    console.log(`${yellow('⚠')} panel build missing at ${dim(serverEntry())}`)
    console.log(dim('  build it with `npm run build`, or install the published package'))
  }

  // 4. Service
  try {
    await installService()
    const kind = PLATFORM === 'darwin' ? 'launchd LaunchAgent' : 'systemd --user unit + linger'
    console.log(`${green('✓')} service installed (${kind})`)
  } catch (e) {
    console.log(`${red('✗')} service install failed: ${e.message}`)
  }

  // 5. Hooks (default on)
  if (noHooks) {
    console.log(dim('• Claude Code hooks skipped (--no-hooks)'))
  } else {
    try {
      const r = await installClaudeHooks()
      console.log(`${green('✓')} Claude Code hooks installed ${dim(`(${r.added} added, ${r.events.length} events)`)}`)
    } catch (e) {
      console.log(`${red('✗')} hook install failed: ${e.message}`)
    }
  }

  // 6. Next steps
  const cfg = loadConfig()
  console.log('')
  console.log(bold('Next'))
  console.log(`  • Panel:    ${dim(`http://${cfg.bind}:${cfg.port}`)}`)
  console.log(`  • Expose:   ${dim('claude-rc expose')}   ${dim('# tailnet-only, via tailscale serve')}`)
  console.log(`  • Launch:   ${dim('claude-rc new my-feature ~/projects/app')}`)
}
