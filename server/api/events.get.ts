import { sessionHub } from '../utils/sessionHub'

// Server-Sent Events: pushes the full session list on connect and on every
// change. One-way is all the panel needs.
export default defineEventHandler(async (event) => {
  const stream = createEventStream(event)
  await sessionHub.addStream(stream)
  stream.onClosed(() => sessionHub.removeStream(stream))
  return stream.send()
})
