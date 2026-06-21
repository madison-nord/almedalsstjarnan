# Almedalsstjärnan

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-green.svg)](https://nodejs.org/)

A Chrome-first, WebExtensions-compatible browser extension for the official [Almedalsveckan programme website](https://almedalsveckan.info). Star and unstar individual events, bulk-star all visible events at once, and export your schedule as an ICS calendar file. Browse starred events in a popup or a full-page stars view with search filtering and multi-criteria sorting. A help/onboarding modal guides new users, a language toggle switches between Swedish and English at runtime, and undo support lets you reverse accidental changes.

## Screenshots

![Star button on almedalsveckan.info programme page](docs/screenshots/star-button.png)

![Popup UI showing starred events summary](docs/screenshots/popup-ui.png)

![Stars page with search, sort, and grid view](docs/screenshots/stars-page.png)

## Features

- ⭐ Star and unstar events directly on the almedalsveckan.info programme page
- 📋 Bulk-star all visible/filtered events with a single click
- 📅 Export starred events as an ICS calendar file for import into Google Calendar, Outlook, or Apple Calendar
- 🔔 Popup UI for quick access to your starred events summary
- 📄 Full-page stars view with search filtering, multi-criteria sorting, and grid layout
- ❓ Help/onboarding modal introducing features to new users
- 🌐 Language toggle switching between Swedish and English at runtime
- ↩️ Undo support to reverse accidental star/unstar actions
- 🎨 Shadow DOM isolation ensuring host page styles never break extension UI
- 📊 Progress indicator during bulk operations

## Prerequisites

- **Node.js** 20 or higher
- **pnpm** (package manager)

## Setup

```bash
pnpm install
```

## Available Scripts

| Script               | Description                            |
| -------------------- | -------------------------------------- |
| `pnpm dev`           | Start Vite dev server with hot reload  |
| `pnpm build`         | Production build to `dist/`            |
| `pnpm preview`       | Preview production build               |
| `pnpm typecheck`     | Run TypeScript type checking           |
| `pnpm lint`          | Run ESLint                             |
| `pnpm lint:fix`      | Run ESLint with auto-fix               |
| `pnpm format`        | Format code with Prettier              |
| `pnpm format:check`  | Check formatting with Prettier         |
| `pnpm test:unit`     | Run unit tests (Vitest)                |
| `pnpm test:property` | Run property-based tests (fast-check)  |
| `pnpm test:e2e`      | Run end-to-end tests (Playwright)      |
| `pnpm test`          | Run all Vitest tests (unit + property) |
| `pnpm package`       | Build and package extension as .zip    |

## Development

### Getting Started

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Build the extension:

   ```bash
   pnpm run build
   ```

3. Load the extension in Chrome:
   - Navigate to `chrome://extensions`
   - Enable **Developer mode** (toggle in the top-right corner)
   - Click **Load unpacked**
   - Select the `dist/` directory in this project

4. For active development with hot reload:

   ```bash
   pnpm run dev
   ```

   This starts a development build that watches for file changes and rebuilds automatically. After each rebuild, click the refresh icon on the extension card in `chrome://extensions` to pick up changes.

## Architecture Overview

The extension follows a message-passing architecture with six main modules:

```
┌─────────────────────────────────────────────────┐
│  Host Page (almedalsveckan.info)                │
│  ┌──────────────┐  ┌────────────────────────┐   │
│  │ Content Script│──│ Star Buttons (Shadow DOM)│  │
│  └──────┬───────┘  └────────────────────────┘   │
└─────────┼───────────────────────────────────────┘
          │ Messages
┌─────────▼───────────────────────────────────────┐
│  Background Service Worker                       │
│  (storage.local — single source of truth)        │
└─────────▲───────────────────────────────────────┘
          │ Messages
┌─────────┼───────────────────────────────────────┐
│  ┌──────┴──────┐  ┌────────────────────────┐    │
│  │  Popup UI   │  │  Stars Page            │    │
│  │  (React +   │  │  (React + Tailwind)    │    │
│  │  Tailwind)  │  │  + ICS Export          │    │
│  └─────────────┘  └────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

### Modules

| Module             | Path                                                                              | Description                                                                                            |
| ------------------ | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Shared Core**    | `src/core/`                                                                       | Pure-logic submodules: browser API adapter, event normalizer, ICS generator, ICS parser, sorter, types |
| **Content Script** | `src/extension/content-script.ts`                                                 | Injected into almedalsveckan.info; observes DOM and injects star buttons                               |
| **Background**     | `src/extension/background.ts`                                                     | Manifest V3 service worker; manages storage and message dispatch                                       |
| **Star Button**    | `src/extension/star-button.ts`                                                    | Shadow DOM-isolated star toggle with scoped CSS                                                        |
| **Bulk Star**      | `src/extension/bulk-star-button.ts`, `bulk-star-coordinator.ts`, `progress-indicator.ts` | Bulk-star all visible events with rate-limited pagination and progress UI                              |
| **Popup UI**       | `src/ui/popup/`                                                                   | Browser action popup showing starred events summary (React + Tailwind)                                 |
| **Stars Page**     | `src/ui/stars/`                                                                   | Full-page starred events view with sort, search, and ICS export (React + Tailwind)                     |
| **Shared UI**      | `src/ui/shared/`                                                                  | Reusable components: HelpModal, LanguageToggle, SortSelector, UndoToast, SearchFilter                  |
| **Manifest**       | `src/extension/manifest/`                                                         | Base manifest + per-browser overrides, merged at build time                                            |

### Key Design Decisions

- **Shadow DOM** for star buttons ensures complete style isolation from host page CSS
- **Browser API Adapter** wraps all `chrome.*` calls behind a testable interface
- **`#` path aliases** (`#core/*`, `#ui/*`, etc.) avoid conflicts with npm scoped packages
- **Tailwind CSS** is used only for Popup UI and Stars Page; star buttons use plain scoped CSS
- **`vite-plugin-web-extension`** handles multi-entry bundling and manifest processing
- **i18n runtime language switching** — the UI reads and persists a language preference in `storage.local`, allowing users to toggle between Swedish and English without reloading the extension
- **Bulk star rate-limiting/pagination** — the bulk-star coordinator processes events in small batches with configurable delays to avoid overwhelming the background service worker and Chrome storage write limits

## Project Structure

```
src/
├── core/           # Shared pure-logic modules
├── extension/      # Content script, background, star button, bulk star, manifest
├── ui/
│   ├── popup/      # Popup UI (React + Tailwind)
│   ├── stars/      # Stars page (React + Tailwind)
│   └── shared/     # Shared UI components (HelpModal, LanguageToggle, etc.)
└── features/       # Reserved for future feature modules

tests/
├── unit/           # Vitest unit tests
├── property/       # fast-check property-based tests
├── e2e/            # Playwright end-to-end tests
└── helpers/        # Test utilities, mocks, generators
```

## Contribution Guidelines

1. **TDD**: Write tests before implementation code
2. **Type safety**: TypeScript strict mode with `noUncheckedIndexedAccess`
3. **No direct browser API calls**: Always use `IBrowserApiAdapter`
4. **Commit format**: `<type>(<scope>): <subject>` (see `.kiro/steering/git-workflow.md`)
5. **Lint and typecheck** must pass before committing
6. **Property-based tests** for core logic (ICS round-trip, sorter invariants, normalizer)

## License

GPL-3.0
