---
inclusion: fileMatch
fileMatchPattern: 'src/extension/**'
---

# Browser Extension Patterns

## Browser API Access

- All `chrome.*` API access MUST go through `IBrowserApiAdapter`.
- No direct `chrome.*` calls outside `src/core/browser-api-adapter.ts`.
- The adapter provides a consistent Promise-based interface for all wrapped methods.
- The adapter is injectable/mockable in all consuming modules for unit testing.

## Content Script Isolation

- The content script runs in the host page context on almedalsveckan.info.
- Use Shadow DOM (open mode) for all injected UI elements.
- Mark processed elements with `data-almedals-planner-initialized="1"` to prevent double-injection.
- Create exactly one `MutationObserver` per document lifetime — no teardown/recreation on route changes.
- Never throw from content script code. Catch all errors and log warnings to console.
- Skip malformed Event_Cards silently without crashing.

## Message Passing

- Use only the 6 defined `MessageCommand` types: `STAR_EVENT`, `UNSTAR_EVENT`, `GET_STAR_STATE`, `GET_ALL_STARRED_EVENTS`, `GET_SORT_ORDER`, `SET_SORT_ORDER`.
- Always send messages via `adapter.sendMessage()`.
- Always handle `MessageResponseError` in the caller.
- The background service worker is the single source of truth for all storage operations.

## Service Worker Lifecycle

- The Manifest V3 service worker may be terminated and restarted by the browser at any time.
- Do NOT store state in module-level variables in `background.ts`.
- Always read from `storage.local` for current state.
- Register the `chrome.runtime.onMessage` listener at the top level of the service worker module.

## Star Button

- Render inside Shadow DOM with open mode.
- Use plain scoped CSS — no Tailwind in the content script.
- Wire click handlers through callbacks (`onStar` / `onUnstar`).
- Use `aria-pressed` to reflect starred state (`true` / `false`).
- Use `aria-label` with localized text from `getMessage('starEvent')` / `getMessage('unstarEvent')`.
- Listen to `storage.onChanged` (via `adapter.onStorageChanged`) for cross-tab consistency.

## Manifest

- Base manifest at `src/extension/manifest/base.json`.
- Per-browser overrides (e.g., `chrome.json`) merged at build time via `mergeManifest()`.
- Arrays are replaced (not concatenated) during merge.
- Nested objects are recursively merged.
