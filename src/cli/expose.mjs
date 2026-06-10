import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { loadConfig } from '../../core/config.mjs'
import { writeStore } from './configstore.mjs'
import { restartService } from './platform.mjs'
import { which, green, yellow, dim, bold, fail } from './util.mjs'

const pexec = promisify(execFile)

export async function run(args) {
  const dryRun = args.includes('--dry-run')
  const pathArg = args.find((a) => a.startsWith('/'))
  const mount = pathArg || '/rc'
  const cfg = loadConfig()

  if (!which('tailscale')) {
    return fail('tailscale not found — install Tailscale and run `tailscale up` first')
  }

  // tailnet-only serve. We deliberately never offer `funnel` (public internet).
  const serveArgs = ['serve', '--bg', '--set-path', mount, String(cfg.port)]
  if (dryRun) {
    console.log(dim('[dry-run] tailscale ' + serveArgs.join(' ')))
    return
  }

  try {
    await pexec('tailscale', serveArgs)
  } catch (e) {
    return fail('tailscale serve failed: ' + (e.stderr || e.message))
  }

  // Persist the mount path and restart so the panel serves its assets under it.
  await writeStore({ baseUrl: mount })
  try {
    await restartService()
  } catch {
    console.log(yellow('⚠') + dim(' could not auto-restart the service; run `claude-rc restart`'))
  }

  console.log(`${green('✓')} exposed on your tailnet at ${bold(mount)} ${dim('(tailnet-only, not public)')}`)
  try {
    const s = await pexec('tailscale', ['status', '--json'])
    const dns = JSON.parse(s.stdout)?.Self?.DNSName?.replace(/\.$/, '')
    if (dns) console.log(`  → https://${dns}${mount}`)
  } catch {
    // best-effort URL print
  }
}
