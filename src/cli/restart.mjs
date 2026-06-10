import { restartService } from './platform.mjs'
import { fail, green } from './util.mjs'

export async function run() {
  try {
    await restartService()
    console.log(`${green('✓')} service restarted`)
  } catch (e) {
    fail(e.message)
  }
}
