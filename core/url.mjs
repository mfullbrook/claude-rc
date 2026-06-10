// Build the one-time bootstrap URL a device opens to authorise itself: opening
// it with a correct ?token= sets the SameSite cookie (see server/middleware/auth.ts).
// Pure + testable.
export function buildBootstrapUrl({
  scheme = 'http',
  host = '127.0.0.1',
  port,
  baseUrl = '/',
  token = '',
} = {}) {
  const base = (baseUrl || '/').replace(/\/+$/, '')
  const defaultPort = scheme === 'https' ? 443 : 80
  const authority = port && port !== defaultPort ? `${host}:${port}` : host
  const query = token ? `?token=${encodeURIComponent(token)}` : ''
  return `${scheme}://${authority}${base}/${query}`
}
