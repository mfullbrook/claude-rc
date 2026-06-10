// Platform service wiring: generate + install/uninstall the always-on service
// as a systemd --user unit (Linux) or a launchd LaunchAgent (macOS). The
// generators are pure (easy to test); the install/uninstall calls touch the
// system.
import os from 'node:os'
import path from 'node:path'
import fsp from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const pexec = promisify(execFile)

export const PLATFORM = process.platform
export const HOME = os.homedir()
export const LABEL = 'com.claude-rc.panel'
export const UNIT = 'claude-rc.service'

export function packageRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
}
export function binPath() {
  return path.join(packageRoot(), 'bin', 'claude-rc.mjs')
}
export function hookPath() {
  return path.join(packageRoot(), 'hooks', 'claude-rc-hook.mjs')
}
export function serverEntry() {
  return path.join(packageRoot(), '.output', 'server', 'index.mjs')
}

// A reliable PATH for the service: stable locations plus whatever the user's
// shell had when they ran setup, so node/tmux/claude are always resolvable even
// under a minimal service environment. Baked into the unit/plist.
export function servicePath() {
  const stable = [
    path.join(HOME, '.local', 'bin'),
    path.join(HOME, 'bin'),
    '/home/linuxbrew/.linuxbrew/bin',
    '/opt/homebrew/bin',
    '/usr/local/bin',
    '/usr/bin',
    '/bin',
    '/usr/local/sbin',
    '/usr/sbin',
    '/sbin',
  ]
  const fromEnv = (process.env.PATH || '').split(path.delimiter).filter(Boolean)
  return [...new Set([...stable, ...fromEnv])].join(path.delimiter)
}
export function isBuilt() {
  return existsSync(serverEntry())
}

// ---------- systemd (Linux) ----------

export function systemdUnitPath() {
  return path.join(HOME, '.config', 'systemd', 'user', UNIT)
}

export function systemdUnit() {
  const cfg = path.join(HOME, '.config', 'claude-rc', 'config.json')
  return `[Unit]
Description=claude-rc — Claude Code Remote Control panel
After=network.target

[Service]
Type=simple
# /usr/bin/env resolves node on the PATH below, so the unit survives a node
# version upgrade (no hard-coded Cellar path).
ExecStart=/usr/bin/env node ${binPath()} serve
Environment=PATH=${servicePath()}
Restart=always
RestartSec=3
# port / bind / token / base URL are read at runtime from
# ${cfg}

[Install]
WantedBy=default.target
`
}

async function systemctl(args) {
  return pexec('systemctl', ['--user', ...args])
}

export async function installSystemd() {
  const p = systemdUnitPath()
  await fsp.mkdir(path.dirname(p), { recursive: true })
  await fsp.writeFile(p, systemdUnit())
  await systemctl(['daemon-reload'])
  await systemctl(['enable', '--now', UNIT])
  // Keep the service running without an active login and across reboots.
  try {
    await pexec('loginctl', ['enable-linger', os.userInfo().username])
  } catch {
    // non-fatal; service still runs while logged in
  }
}

export async function uninstallSystemd() {
  try {
    await systemctl(['disable', '--now', UNIT])
  } catch {
    /* not installed */
  }
  try {
    await fsp.unlink(systemdUnitPath())
  } catch {
    /* already gone */
  }
  try {
    await systemctl(['daemon-reload'])
  } catch {
    /* ignore */
  }
}

export async function statusSystemd() {
  try {
    const o = await systemctl(['is-active', UNIT])
    return o.stdout.trim()
  } catch (e) {
    return (e.stdout || 'inactive').trim()
  }
}

export function logsCommandSystemd() {
  return ['journalctl', ['--user', '-u', UNIT, '-n', '60', '--no-pager', '-f']]
}

// ---------- launchd (macOS) ----------

export function launchdPlistPath() {
  return path.join(HOME, 'Library', 'LaunchAgents', `${LABEL}.plist`)
}

export function launchdLogPath() {
  return path.join(HOME, 'Library', 'Logs', 'claude-rc.log')
}

export function launchdPlist() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/env</string>
    <string>node</string>
    <string>${binPath()}</string>
    <string>serve</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>${servicePath()}</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>${launchdLogPath()}</string>
  <key>StandardErrorPath</key><string>${launchdLogPath()}</string>
</dict>
</plist>
`
}

export async function installLaunchd() {
  const p = launchdPlistPath()
  await fsp.mkdir(path.dirname(p), { recursive: true })
  await fsp.mkdir(path.dirname(launchdLogPath()), { recursive: true })
  await fsp.writeFile(p, launchdPlist())
  const uid = os.userInfo().uid
  try {
    await pexec('launchctl', ['bootout', `gui/${uid}/${LABEL}`])
  } catch {
    /* wasn't loaded */
  }
  try {
    await pexec('launchctl', ['bootstrap', `gui/${uid}`, p])
  } catch {
    await pexec('launchctl', ['load', '-w', p])
  }
  try {
    await pexec('launchctl', ['enable', `gui/${uid}/${LABEL}`])
  } catch {
    /* ignore */
  }
}

export async function uninstallLaunchd() {
  const uid = os.userInfo().uid
  try {
    await pexec('launchctl', ['bootout', `gui/${uid}/${LABEL}`])
  } catch {
    /* not loaded */
  }
  try {
    await fsp.unlink(launchdPlistPath())
  } catch {
    /* already gone */
  }
}

export async function statusLaunchd() {
  const uid = os.userInfo().uid
  try {
    await pexec('launchctl', ['print', `gui/${uid}/${LABEL}`])
    return 'loaded'
  } catch {
    return 'not loaded'
  }
}

export function logsCommandLaunchd() {
  return ['tail', ['-n', '60', '-f', launchdLogPath()]]
}

export async function restartSystemd() {
  await systemctl(['restart', UNIT])
}
export async function restartLaunchd() {
  const uid = os.userInfo().uid
  await pexec('launchctl', ['kickstart', '-k', `gui/${uid}/${LABEL}`])
}

// ---------- dispatch by platform ----------

export async function installService() {
  if (PLATFORM === 'linux') return installSystemd()
  if (PLATFORM === 'darwin') return installLaunchd()
  throw new Error(`unsupported platform: ${PLATFORM} (Linux/macOS only)`)
}
export async function uninstallService() {
  if (PLATFORM === 'linux') return uninstallSystemd()
  if (PLATFORM === 'darwin') return uninstallLaunchd()
}
export async function serviceStatus() {
  if (PLATFORM === 'linux') return statusSystemd()
  if (PLATFORM === 'darwin') return statusLaunchd()
  return 'unknown'
}
export function logsCommand() {
  if (PLATFORM === 'linux') return logsCommandSystemd()
  if (PLATFORM === 'darwin') return logsCommandLaunchd()
  return null
}
export async function restartService() {
  if (PLATFORM === 'linux') return restartSystemd()
  if (PLATFORM === 'darwin') return restartLaunchd()
  throw new Error(`unsupported platform: ${PLATFORM}`)
}
