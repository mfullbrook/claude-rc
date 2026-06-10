import { serviceStatus, PLATFORM, UNIT, LABEL, isBuilt } from './platform.mjs'
import { loadConfig } from '../../core/config.mjs'
import { green, red, yellow, dim } from './util.mjs'

export async function run() {
  const st = await serviceStatus()
  const cfg = loadConfig()
  const ok = st === 'active' || st === 'loaded'
  const unit = PLATFORM === 'darwin' ? LABEL : UNIT
  console.log(`${ok ? green('●') : red('○')} service: ${st} ${dim(`(${unit})`)}`)
  console.log(dim(`  panel:  http://${cfg.bind}:${cfg.port}   base ${cfg.baseUrl}`))
  console.log(dim(`  tmux:   ${cfg.tmuxSession}`))
  if (!isBuilt()) console.log(`${yellow('⚠')} panel build missing — run \`npm run build\``)
}
