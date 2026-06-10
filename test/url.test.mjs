import { describe, expect, it } from 'vitest'
import { buildBootstrapUrl } from '../core/url.mjs'

describe('buildBootstrapUrl', () => {
  it('builds a local loopback URL with port + token', () => {
    expect(buildBootstrapUrl({ host: '127.0.0.1', port: 8765, baseUrl: '/', token: 'abc' })).toBe(
      'http://127.0.0.1:8765/?token=abc',
    )
  })

  it('builds a tailnet https URL under a mount path, omitting the default port', () => {
    expect(
      buildBootstrapUrl({ scheme: 'https', host: 'box.ts.net', baseUrl: '/rc', token: 'abc' }),
    ).toBe('https://box.ts.net/rc/?token=abc')
  })

  it('omits the query when there is no token', () => {
    expect(buildBootstrapUrl({ host: '127.0.0.1', port: 8765 })).toBe('http://127.0.0.1:8765/')
  })

  it('url-encodes the token', () => {
    expect(buildBootstrapUrl({ host: 'h', port: 80, token: 'a/b+c' })).toBe(
      'http://h/?token=a%2Fb%2Bc',
    )
  })
})
