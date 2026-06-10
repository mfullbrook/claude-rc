import { killSession } from '../../core/sessions.mjs'
import { isValidWindowId } from '../../core/tmux.mjs'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const target = body?.target
  if (!isValidWindowId(target)) {
    return { ok: false, message: 'invalid window id' }
  }
  try {
    await killSession(target)
    return { ok: true }
  } catch (e: any) {
    return { ok: false, message: e?.message || String(e) }
  }
})
