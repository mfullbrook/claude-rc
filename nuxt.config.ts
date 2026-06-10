// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  devtools: { enabled: false },
  // The panel is a single-user, authenticated localhost dashboard reached via
  // Tailscale; it can live behind a mount prefix (e.g. /rc) set at runtime.
  app: {
    baseURL: process.env.CLAUDE_RC_BASE_URL || '/',
  },
  runtimeConfig: {
    // Server-only. Populated by `claude-rc setup`; never bake a token into the build.
    tmuxSession: process.env.CLAUDE_RC_TMUX_SESSION || 'rc',
    token: process.env.CLAUDE_RC_TOKEN || '',
    stateDir: process.env.CLAUDE_RC_STATE_DIR || '',
    public: {
      hostname: '',
    },
  },
  nitro: {
    // Single self-contained Node server output, run by `claude-rc serve`.
    preset: 'node-server',
  },
})
