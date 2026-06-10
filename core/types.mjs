// Shared type contracts for the plain-JS core. These JSDoc typedefs are the
// single source of truth for the session-record shape, enforced by
// `tsc --checkJs` (npm run typecheck) across the writers (launch.mjs, the hook)
// and readers (sessions.mjs, the panel). No runtime code — types only.
//
// Note: keep descriptions free of "@" — JSDoc treats a stray "@word" as a new
// tag and silently truncates the typedef.

/**
 * One session's enrichment record on disk ($stateDir/sessions/<rcId>.json).
 * The launcher writes the lifecycle fields; the Claude Code hook merges the
 * enrichment fields. All optional except rcId so a partial merge is valid.
 *
 * @typedef {Object} SessionRecord
 * @property {string} rcId
 * @property {string} [rcName]
 * @property {string} [windowId]
 * @property {string} [dir]
 * @property {number} [startedAt]
 * @property {string} [status]
 * @property {number} [endedAt]
 * @property {string} [displayName]
 * @property {string} [claudeSessionId]
 * @property {string} [model]
 * @property {string} [title]
 * @property {number} [messageCount]
 * @property {string} [lastMessage]
 * @property {string} [lastRole]
 * @property {number} [updatedAt]
 */

/**
 * A live tmux window as parsed from `tmux list-windows` (see core/tmux.mjs).
 *
 * @typedef {Object} TmuxWindow
 * @property {string} windowId
 * @property {string} windowName
 * @property {string} dir
 * @property {string} command
 * @property {boolean} running
 * @property {number} activity
 * @property {(string|null)} rcId
 * @property {(string|null)} rcName
 */

export {}
