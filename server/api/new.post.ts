import { launchSession } from '../../core/launch.mjs'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  try {
    const session = await launchSession({ name: body?.name, dir: body?.dir })
    return { ok: true, session }
  } catch (e: any) {
    return { ok: false, message: e?.message || String(e) }
  }
})
