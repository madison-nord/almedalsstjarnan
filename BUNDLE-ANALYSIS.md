# Bundle Analysis

## Overview

This document records the composition of the Vite-generated shared chunk and the
optimization applied to reduce its size. The analysis was performed after applying
`manualChunks` to separate React/ReactDOM into a dedicated vendor chunk.

**Build date:** 2025-07  
**Total `dist/` size:** ~364 KB (well below the 500 KB limit)

## Chunk Summary

| Chunk | Size (KB) | Description |
|-------|-----------|-------------|
| `vendor-react.js` | 185.18 | React + ReactDOM runtime |
| `conflict-detector.js` | 38.62 | Shared modules used by both popup and stars entries |
| `content-script.js` | 45.74 | Content script (standalone, no code splitting) |
| `stars.js` | 15.10 | Stars page entry |
| `popup.js` | 8.97 | Popup entry |
| `background.js` | 5.64 | Background service worker (standalone) |
| `popup.css` | 14.44 | Shared Tailwind CSS (popup + stars) |
| `stars.css` | 14.32 | Stars page Tailwind CSS |
| `rolldown-runtime.js` | 0.55 | Module runtime loader |

## Shared Chunk: `conflict-detector.js`

After optimization the shared chunk is **38.62 KB** (10.28 KB gzipped), well below
the 150 KB threshold.

### Module Breakdown

| Module | Approx. Size (KB) | Purpose |
|--------|-------------------|---------|
| Inline locale messages (sv + en) | ~21 | All UI strings for both languages, embedded for offline use |
| ICS generator (`ics-generator.ts`) | ~4 | Calendar export with RFC 5545 line folding |
| Conflict detector (`conflict-detector.ts`) | ~3 | Time-overlap detection for starred events |
| Date formatter (`date-formatter.ts`) | ~3 | Localized date/time display formatting |
| Help modal + feature groups | ~3 | Shared help overlay UI component |
| Browser API adapter | ~1.5 | Chrome extension API wrapper |
| Sort selector + sorter | ~1.5 | Sort order UI and sort logic |
| Undo toast | ~0.5 | Shared toast notification component |
| Language toggle + hook | ~0.5 | Language switching UI and adapter hook |
| Vite modulepreload polyfill | ~0.5 | Preload support for older browsers |

**Total:** ~39 KB

All modules in this chunk are shared between the popup and stars page entries.
Vite groups them here to avoid duplicating code across entry points.

## Optimizations Applied

### `manualChunks` — Separate React/ReactDOM into `vendor-react`

**Problem:** Before optimization, the shared chunk was ~230 KB because Vite bundled
React and ReactDOM together with the application's shared modules into a single
common chunk named `conflict-detector.js`.

**Solution:** A Vite plugin (`vendorChunks`) was added to `vite.config.ts` that
applies `manualChunks` to multi-entry HTML builds:

```typescript
function vendorChunks(): Plugin {
  return {
    name: 'vendor-chunks',
    outputOptions(options) {
      if ((options as Record<string, unknown>).codeSplitting === false) {
        return;
      }
      const output = options;
      output.manualChunks = (id: string) => {
        if (id.includes('node_modules/react')) {
          return 'vendor-react';
        }
      };
      return output;
    },
  };
}
```

This routes all `react` and `react-dom` imports into a dedicated `vendor-react.js`
chunk (~185 KB), leaving only the application's own shared logic in
`conflict-detector.js` (~39 KB).

The plugin skips individual script builds (background, content script) where
code splitting is disabled by `vite-plugin-web-extension`.

**Result:**

| Metric | Before | After |
|--------|--------|-------|
| Shared chunk (`conflict-detector.js`) | ~230 KB | ~39 KB |
| Vendor chunk (`vendor-react.js`) | — | ~185 KB |
| Total dist/ size | ~364 KB | ~364 KB |

The total size is unchanged (React must still be bundled), but the shared chunk
is now well below the 150 KB threshold. No justification section is needed.

## Notes

- The `vendor-react.js` chunk contains React 19.2.5 and ReactDOM 19.2.5. These
  are required runtime dependencies for both the popup and stars page UIs.
- The inline locale data (~21 KB) is the largest contributor to the shared chunk.
  This is intentional — embedding translations avoids async loading and ensures
  the extension works fully offline.
- Further size reduction is possible by extracting locale data into a separate
  chunk, but at 39 KB total this is unnecessary.
