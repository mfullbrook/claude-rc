// Placeholder app icon: a coral rounded square with an "rc" wordmark.
// Deliberately NOT Anthropic's asterisk glyph (see the trademark/no-mimicry
// decision). Replaced when the real logo lands.
export default defineEventHandler((event) => {
  setResponseHeader(event, 'content-type', 'image/svg+xml; charset=utf-8')
  setResponseHeader(event, 'cache-control', 'public, max-age=86400')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="claude-rc">
  <rect width="512" height="512" rx="112" fill="#D97757"/>
  <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="248" font-weight="700" fill="#ffffff">rc</text>
</svg>`
})
