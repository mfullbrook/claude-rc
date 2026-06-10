import { listSessions } from '../../core/sessions.mjs'

export default defineEventHandler(async () => {
  return await listSessions()
})
