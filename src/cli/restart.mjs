import { restartService } from './platform.mjs'
import { green, fail } from './util.mjs'

export async function run() {
  try {
    await restartService()
    console.log(`${green('✓')} service restarted`)
  } catch (e) {
    fail(e.message)
  }
}
