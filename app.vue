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

// Host-qualified PWA install: the manifest is served per-host, and the visible
// name/title carry the host so a MacBook panel and a VPS panel are distinct
// apps on the same Home Screen rather than colliding clones.
const appTitle = `claude-rc · ${requestURL.host}`
useHead({
  title: appTitle,
  link: [
    { rel: 'manifest', href: api('/manifest.webmanifest') },
    { rel: 'icon', type: 'image/png', sizes: '32x32', href: api('/favicon-32.png') },
    { rel: 'icon', type: 'image/png', sizes: '16x16', href: api('/favicon-16.png') },
    { rel: 'apple-touch-icon', href: api('/apple-touch-icon.png') },
  ],
  meta: [
    { name: 'theme-color', content: '#D97757' },
    { name: 'mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-title', content: appTitle },
  ],
})

type Status = 'loading' | 'ok' | 'unauthorized' | 'error'
const status = ref<Status>('loading')
const sessions = ref<Session[]>([])
const connected = ref(false)
const name = ref('')
const dir = ref('')
const busy = ref(false)

let es: EventSource | null = null

function isUnauthorized(e: any) {
  return e?.statusCode === 401 || e?.status === 401 || e?.response?.status === 401
}

async function fetchOnce() {
  try {
    const d = await $fetch<{ sessions: Session[] }>(api('/api/sessions'))
    sessions.value = d.sessions || []
    status.value = 'ok'
  } catch (e) {
    if (isUnauthorized(e)) {
      status.value = 'unauthorized'
      es?.close()
    } else if (status.value === 'loading') {
      status.value = 'error'
    }
    // otherwise keep the last-good state; SSE/poll will recover
  }
}

function connect() {
  if (!import.meta.client || status.value === 'unauthorized') return
  es?.close()
  es = new EventSource(api('/api/events'))
  es.onopen = () => (connected.value = true)
  es.onmessage = (e) => {
    try {
      sessions.value = JSON.parse(e.data).sessions || []
      connected.value = true
      status.value = 'ok'
    } catch {
      // ignore malformed frame
    }
  }
  es.onerror = () => {
    connected.value = false
    // EventSource reconnects on its own. A 401 can't be read here, so the next
    // fetchOnce (on focus) is what flips us to the unauthorized state.
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
    if (isUnauthorized(e)) status.value = 'unauthorized'
    else toast.add({ title: 'Launch failed', description: String(e), color: 'error' })
  } finally {
    busy.value = false
    fetchOnce()
  }
}

// --- kill (modal-confirmed; a mis-tap opens the modal, never kills) ---
const killTarget = ref<Session | null>(null)
const killOpen = computed({
  get: () => killTarget.value !== null,
  set: (v: boolean) => {
    if (!v) killTarget.value = null
  },
})

async function confirmKill() {
  const s = killTarget.value
  killTarget.value = null
  if (!s) return
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

// --- rename (modal; replaces prompt(), which iOS standalone blocks) ---
const renameTarget = ref<Session | null>(null)
const renameValue = ref('')
const renameOpen = computed({
  get: () => renameTarget.value !== null,
  set: (v: boolean) => {
    if (!v) renameTarget.value = null
  },
})

function askRename(s: Session) {
  if (!s.rcId) {
    toast.add({ title: 'Cannot rename', description: 'not launched by claude-rc', color: 'error' })
    return
  }
  renameValue.value = s.name
  renameTarget.value = s
}

async function confirmRename() {
  const s = renameTarget.value
  const label = renameValue.value
  renameTarget.value = null
  if (!s?.rcId) return
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

function rolePrefix(role: string | null | undefined) {
  if (role === 'user') return 'you: '
  if (role === 'assistant') return 'Claude: '
  return ''
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

const liveLabel = computed(() =>
  status.value === 'loading' ? '…' : connected.value ? 'live' : 'reconnecting…',
)
</script>

<template>
  <UApp>
    <div class="min-h-screen bg-default text-default">
      <div class="mx-auto max-w-2xl px-4 pb-16 pt-6">
        <!-- header -->
        <header class="mb-1 flex items-center gap-3">
          <div
            class="flex size-7 flex-none items-center justify-center rounded-lg bg-primary font-mono text-sm font-bold text-inverted"
          >
            rc
          </div>
          <h1 class="text-lg font-semibold tracking-tight">Remote Sessions</h1>
          <span
            v-if="status !== 'unauthorized'"
            class="ml-auto inline-flex items-center gap-1.5 text-xs text-muted"
            :title="liveLabel"
          >
            <span
              class="size-2 rounded-full"
              :class="connected ? 'bg-success' : status === 'loading' ? 'bg-muted' : 'bg-warning'"
            />
            {{ liveLabel }}
          </span>
        </header>
        <p class="mb-6 text-sm text-muted">
          Claude Code Remote Control on
          <code class="text-xs">{{ requestURL.host }}</code>
          · open a session in the Claude app’s Code tab
        </p>

        <!-- unauthorized: the cookie lapsed or this device never signed in -->
        <section
          v-if="status === 'unauthorized'"
          class="rounded-xl border border-default bg-elevated p-5"
        >
          <h2 class="text-sm font-semibold">Authorise this device</h2>
          <p class="mt-2 text-sm text-muted">
            This browser isn’t signed in (its token is missing or expired). Open the panel using
            the one-time link from the host:
          </p>
          <ul class="mt-3 space-y-1 text-sm text-muted">
            <li>• scan the QR from <code class="text-xs">claude-rc qr</code>, or</li>
            <li>• open the URL printed by <code class="text-xs">claude-rc status</code></li>
          </ul>
          <p class="mt-3 text-xs text-dimmed">
            The link sets a token cookie for this device. Bookmarks then work until it expires.
          </p>
          <UButton class="mt-4" color="neutral" variant="soft" label="Retry" @click="fetchOnce" />
        </section>

        <template v-else>
          <!-- new session -->
          <section class="mb-5 rounded-xl border border-default bg-elevated p-4">
            <h2 class="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
              New session
            </h2>
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
                <label class="text-xs text-muted" for="dir">
                  Directory <span class="text-dimmed">(optional)</span>
                </label>
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
            <div class="flex items-center justify-between px-2 py-2">
              <h2 class="text-xs font-semibold uppercase tracking-wide text-muted">Sessions</h2>
              <span v-if="!connected && status === 'ok'" class="text-xs text-warning">
                reconnecting — showing last known state
              </span>
            </div>

            <p v-if="status === 'loading'" class="px-2 py-8 text-center text-sm text-dimmed">
              Loading…
            </p>
            <p v-else-if="status === 'error'" class="px-2 py-8 text-center text-sm text-muted">
              Can’t reach the panel server.
              <UButton class="ml-1" size="xs" variant="ghost" label="Retry" @click="fetchOnce" />
            </p>
            <div v-else-if="!sessions.length" class="px-2 py-10 text-center">
              <p class="text-sm text-muted">No sessions yet.</p>
              <p class="mx-auto mt-1 max-w-xs text-xs text-dimmed">
                Start one above — it appears here and in the Claude app’s Code tab on your phone.
              </p>
            </div>

            <ul
              v-else
              class="divide-y divide-default transition-opacity"
              :class="{ 'opacity-60': !connected }"
            >
              <li v-for="s in sessions" :key="s.id" class="flex items-start gap-3 px-2 py-3">
                <span
                  class="mt-1.5 size-2.5 flex-none rounded-full"
                  :class="s.running ? 'bg-success' : 'bg-muted'"
                  :title="s.running ? 'running' : 'idle'"
                />
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <span class="truncate font-medium">{{ s.name }}</span>
                    <span v-if="s.enrichment?.title" class="truncate text-xs text-muted">
                      — {{ s.enrichment.title }}
                    </span>
                  </div>
                  <div class="truncate font-mono text-xs text-muted">{{ homeShort(s.dir) }}</div>
                  <div class="mt-0.5 text-xs text-dimmed">{{ metaLine(s) }}</div>
                  <div v-if="s.enrichment?.lastMessage" class="mt-1 line-clamp-2 text-xs text-muted">
                    <span class="text-dimmed">{{ rolePrefix(s.enrichment.lastRole) }}</span>{{ s.enrichment.lastMessage }}
                  </div>
                </div>
                <div class="flex flex-none items-center gap-2">
                  <UButton color="neutral" variant="ghost" size="sm" label="Rename" @click="askRename(s)" />
                  <UButton color="error" variant="soft" size="sm" label="Kill" @click="killTarget = s" />
                </div>
              </li>
            </ul>
          </section>
        </template>

        <p class="mt-6 text-center text-xs text-dimmed">Unofficial · not affiliated with Anthropic</p>
      </div>

      <!-- kill confirmation -->
      <UModal v-model:open="killOpen" title="Kill session?">
        <template #body>
          <p class="text-sm text-muted">
            Kill <strong class="text-default">{{ killTarget?.name }}</strong>? The tmux window and
            its Claude session end immediately.
          </p>
        </template>
        <template #footer>
          <div class="flex w-full justify-end gap-2">
            <UButton color="neutral" variant="ghost" label="Cancel" @click="killTarget = null" />
            <UButton color="error" label="Kill" @click="confirmKill" />
          </div>
        </template>
      </UModal>

      <!-- rename -->
      <UModal v-model:open="renameOpen" title="Rename session">
        <template #body>
          <label class="mb-1 block text-xs text-muted">Display name</label>
          <UInput
            v-model="renameValue"
            class="w-full"
            autofocus
            autocapitalize="off"
            autocomplete="off"
            @keyup.enter="confirmRename"
          />
          <p class="mt-2 text-xs text-dimmed">Shown in the panel only; doesn’t rename the tmux window.</p>
        </template>
        <template #footer>
          <div class="flex w-full justify-end gap-2">
            <UButton color="neutral" variant="ghost" label="Cancel" @click="renameTarget = null" />
            <UButton label="Save" @click="confirmRename" />
          </div>
        </template>
      </UModal>
    </div>
  </UApp>
</template>
