// Host-qualified PWA manifest, served dynamically so each machine's panel
// installs as a distinct Home Screen app (different origin + host-qualified
// name) rather than colliding with another host's "claude-rc".
export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  // Behind `tailscale serve` the public host arrives via X-Forwarded-Host.
  const host = getRequestHeader(event, 'x-forwarded-host') || url.host
  const base = (process.env.CLAUDE_RC_BASE_URL || '/').replace(/\/+$/, '')
  const scope = `${base}/`
  const shortName = host.split(':')[0]?.split('.')[0] || 'claude-rc'

  const manifest = {
    id: scope,
    name: `claude-rc · ${host}`,
    short_name: shortName,
    description: 'Remote-control your Claude Code sessions',
    start_url: scope,
    scope,
    display: 'standalone',
    theme_color: '#D97757',
    background_color: '#F0EEE6',
    icons: [
      { src: `${base}/icon.svg`, sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
    ],
  }

  setResponseHeader(event, 'content-type', 'application/manifest+json; charset=utf-8')
  return JSON.stringify(manifest)
})
