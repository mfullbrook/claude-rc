import { renameSession } from '../../core/sessions.mjs'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (!body?.rcId) {
    return { ok: false, message: 'rcId is required' }
  }
  try {
    const result = await renameSession(body.rcId, body.label || '')
    return { ok: true, ...result }
  } catch (e: any) {
    return { ok: false, message: e?.message || String(e) }
  }
})
