import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const pexec = promisify(execFile)

// The tailnet DNS name of this machine (e.g. box.tailXXXX.ts.net), or null if
// tailscale isn't running / installed.
export async function tailnetDns() {
  try {
    const out = await pexec('tailscale', ['status', '--json'], { timeout: 5000 })
    const dns = JSON.parse(out.stdout)?.Self?.DNSName?.replace(/\.$/, '')
    return dns || null
  } catch {
    return null
  }
}
