<script setup lang="ts">
type Enrichment = {
  title: string | null
  model: string | null
  messageCount: number | null
  lastMessage: string | null
  lastRole: string | null
  updatedAt: number | null
  claudeSessionId: string | null
  status: string | null
}
type Session = {
  id: string
  rcId: string | null
  name: string
  appName: string
  dir: string
  command: string
  running: boolean
  activity: number
  enrichment: Enrichment | null
}

const toast = useToast()
const requestURL = useRequestURL()

// All API/SSE URLs are built relative to the runtime base URL so the panel
// works whether it's mounted at / or behind a prefix like /rc.
const base = (useRuntimeConfig().app.baseURL || '/').replace(/\/$/, '')
const api = (p: string) => `${base}${p}`

const sessions = ref<Session[]>([])
const connected = ref(false)
const name = ref('')
const dir = ref('')
const busy = ref(false)

let es: EventSource | null = null

async function fetchOnce() {
  try {
    const d = await $fetch<{ sessions: Session[] }>(api('/api/sessions'))
    sessions.value = d.sessions || []
  } catch {
    // transient; SSE/poll will catch up
  }
}

function connect() {
  if (!import.meta.client) return
  es?.close()
  es = new EventSource(api('/api/events'))
  es.onopen = () => (connected.value = true)
  es.onmessage = (e) => {
    try {
      sessions.value = JSON.parse(e.data).sessions || []
      connected.value = true
    } catch {
      // ignore malformed frame
    }
  }
  es.onerror = () => {
    connected.value = false
    // EventSource reconnects on its own; nothing to do.
  }
}

function onRefocus() {
  if (typeof document !== 'undefined' && document.hidden) return
  fetchOnce()
  if (!es || es.readyState === 2 /* CLOSED */) connect()
}

onMounted(() => {
  fetchOnce()
  connect()
  document.addEventListener('visibilitychange', onRefocus)
  window.addEventListener('focus', onRefocus)
})

onBeforeUnmount(() => {
  es?.close()
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', onRefocus)
    window.removeEventListener('focus', onRefocus)
  }
})

async function create() {
  if (!name.value.trim()) return
  busy.value = true
  try {
    const r = await $fetch<{ ok: boolean; message?: string; session?: Session }>(api('/api/new'), {
      method: 'POST',
      body: { name: name.value, dir: dir.value },
    })
    if (r.ok) {
      toast.add({ title: `Launched ${r.session?.name}`, color: 'success' })
      name.value = ''
      dir.value = ''
    } else {
      toast.add({ title: 'Launch failed', description: r.message, color: 'error' })
    }
  } catch (e) {
    toast.add({ title: 'Launch failed', description: String(e), color: 'error' })
  } finally {
    busy.value = false
    fetchOnce()
  }
}

async function kill(s: Session) {
  if (!confirm(`Kill session "${s.name}"?`)) return
  try {
    const r = await $fetch<{ ok: boolean; message?: string }>(api('/api/kill'), {
      method: 'POST',
      body: { target: s.id },
    })
    toast.add(
      r.ok
        ? { title: `Killed ${s.name}`, color: 'success' }
        : { title: 'Kill failed', description: r.message, color: 'error' },
    )
  } catch (e) {
    toast.add({ title: 'Kill failed', description: String(e), color: 'error' })
  } finally {
    fetchOnce()
  }
}

async function rename(s: Session) {
  if (!s.rcId) {
    toast.add({ title: 'Cannot rename', description: 'not launched by claude-rc', color: 'error' })
    return
  }
  const label = prompt('Display name', s.name)
  if (label == null) return
  try {
    const r = await $fetch<{ ok: boolean; message?: string }>(api('/api/rename'), {
      method: 'POST',
      body: { rcId: s.rcId, label },
    })
    if (!r.ok) toast.add({ title: 'Rename failed', description: r.message, color: 'error' })
  } catch (e) {
    toast.add({ title: 'Rename failed', description: String(e), color: 'error' })
  } finally {
    fetchOnce()
  }
}

function timeAgo(epoch: number | null | undefined) {
  if (!epoch) return ''
  const s = Math.max(0, Math.floor(Date.now() / 1000) - epoch)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function homeShort(p: string) {
  const m = p.match(/^\/(?:home|Users)\/[^/]+(\/.*)?$/)
  return m ? '~' + (m[1] || '') : p
}

function metaLine(s: Session) {
  const bits: string[] = [s.running ? 'running' : 'idle']
  const e = s.enrichment
  const when = e?.updatedAt || s.activity
  if (when) bits.push(timeAgo(when))
  if (e?.messageCount != null) bits.push(`${e.messageCount} msg${e.messageCount === 1 ? '' : 's'}`)
  if (e?.model) bits.push(e.model)
  return bits.join(' · ')
}
</script>

<template>
  <UApp>
    <div class="min-h-screen bg-default text-default">
      <div class="mx-auto max-w-2xl px-4 pb-16 pt-6">
        <!-- header -->
        <header class="mb-1 flex items-center gap-3">
          <div
            class="flex size-7 flex-none items-center justify-center rounded-lg bg-primary font-bold text-inverted"
          >
            ✳
          </div>
          <h1 class="text-lg font-semibold tracking-tight">Remote Sessions</h1>
          <span
            class="ml-auto inline-flex items-center gap-1.5 text-xs text-muted"
            :title="connected ? 'live' : 'reconnecting'"
          >
            <span
              class="size-2 rounded-full"
              :class="connected ? 'bg-success' : 'bg-muted'"
            />
            {{ connected ? 'live' : '…' }}
          </span>
        </header>
        <p class="mb-6 text-sm text-muted">
          Claude Code Remote Control on
          <code class="text-xs">{{ requestURL.host }}</code>
          · open a session in the Claude app’s Code tab
        </p>

        <!-- new session -->
        <section class="mb-5 rounded-xl border border-default bg-elevated p-4">
          <h2 class="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">New session</h2>
          <form class="flex flex-wrap items-end gap-3" @submit.prevent="create">
            <div class="flex min-w-44 flex-1 flex-col gap-1">
              <label class="text-xs text-muted" for="name">Name</label>
              <UInput
                id="name"
                v-model="name"
                placeholder="my-feature"
                autocapitalize="off"
                autocomplete="off"
                spellcheck="false"
                required
              />
            </div>
            <div class="flex min-w-44 flex-1 flex-col gap-1">
              <label class="text-xs text-muted" for="dir">Directory <span class="text-dimmed">(optional)</span></label>
              <UInput
                id="dir"
                v-model="dir"
                placeholder="~/projects/app"
                autocapitalize="off"
                autocomplete="off"
                spellcheck="false"
              />
            </div>
            <UButton type="submit" :loading="busy" label="Launch" />
          </form>
        </section>

        <!-- sessions -->
        <section class="rounded-xl border border-default bg-elevated p-2">
          <h2 class="px-2 py-2 text-xs font-semibold uppercase tracking-wide text-muted">Sessions</h2>
          <p v-if="!sessions.length" class="px-2 py-3 text-sm text-muted">No sessions running.</p>
          <ul v-else class="divide-y divide-default">
            <li v-for="s in sessions" :key="s.id" class="flex items-start gap-3 px-2 py-3">
              <span
                class="mt-1.5 size-2.5 flex-none rounded-full"
                :class="s.running ? 'bg-success' : 'bg-muted'"
                :title="s.running ? 'running' : 'idle'"
              />
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="truncate font-medium">{{ s.name }}</span>
                  <span v-if="s.enrichment?.title" class="truncate text-xs text-muted">— {{ s.enrichment.title }}</span>
                </div>
                <div class="truncate font-mono text-xs text-muted">{{ homeShort(s.dir) }}</div>
                <div class="mt-0.5 text-xs text-dimmed">{{ metaLine(s) }}</div>
                <div v-if="s.enrichment?.lastMessage" class="mt-1 line-clamp-2 text-xs text-muted">
                  {{ s.enrichment.lastMessage }}
                </div>
              </div>
              <div class="flex flex-none items-center gap-1">
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  label="Rename"
                  @click="rename(s)"
                />
                <UButton
                  color="error"
                  variant="soft"
                  size="xs"
                  label="Kill"
                  @click="kill(s)"
                />
              </div>
            </li>
          </ul>
        </section>

        <p class="mt-6 text-center text-xs text-dimmed">
          Unofficial · not affiliated with Anthropic
        </p>
      </div>
    </div>
  </UApp>
</template>
