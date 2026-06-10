import qrcode from 'qrcode-terminal'
import { loadConfig } from '../../core/config.mjs'
import { buildBootstrapUrl } from '../../core/url.mjs'
import { tailnetDns } from './tailscale.mjs'
import { dim, fail, yellow } from './util.mjs'

// Render a scannable QR of a bootstrap URL to the terminal, with the URL beneath.
export function printQR(url) {
  qrcode.generate(url, { small: true })
  console.log(dim(`  ${url}`))
}

export async function run() {
  const cfg = loadConfig()
  if (!cfg.token) {
    return fail('no token configured — run `claude-rc setup` first')
  }

  const dns = await tailnetDns()
  if (dns) {
    const url = buildBootstrapUrl({
      scheme: 'https',
      host: dns,
      baseUrl: cfg.baseUrl,
      token: cfg.token,
    })
    console.log(dim('Scan to authorise + open the panel on your phone (tailnet-only):'))
    printQR(url)
  } else {
    const host = cfg.bind === '0.0.0.0' ? '127.0.0.1' : cfg.bind
    const url = buildBootstrapUrl({
      scheme: 'http',
      host,
      port: cfg.port,
      baseUrl: cfg.baseUrl,
      token: cfg.token,
    })
    console.log(yellow('tailscale not detected — this URL is only scannable from this machine.'))
    console.log(dim('Run `claude-rc expose` to get a phone-scannable tailnet URL.'))
    printQR(url)
  }
}
