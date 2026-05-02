# Almedalsstjärnan

A Chrome-first, WebExtensions-compatible browser extension that lets you star events on the official [Almedalsveckan programme website](https://almedalsveckan.info), view starred events in a dedicated page, sort them by multiple criteria, and export your schedule as an ICS calendar file.

## Prerequisites

- **Node.js** 20 or higher
- **pnpm** (package manager)

## Setup

```bash
pnpm install
```

## Available Scripts

| Script | Description |
|---|---|
| `pnpm dev` | Start Vite dev server with hot reload |
| `pnpm build` | Production build to `dist/` |
| `pnpm preview` | Preview production build |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm lint` | Run ESLint |
| `pnpm lint:fix` | Run ESLint with auto-fix |
| `pnpm format` | Format code with Prettier |
| `pnpm format:check` | Check formatting with Prettier |
| `pnpm test:unit` | Run unit tests (Vitest) |
| `pnpm test:property` | Run property-based tests (fast-check) |
| `pnpm test:e2e` | Run end-to-end tests (Playwright) |
| `pnpm test` | Run all Vitest tests (unit + property) |
| `pnpm package` | Build and package extension as .zip |

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

| Module | Path | Description |
|---|---|---|
| **Shared Core** | `src/core/` | Pure-logic submodules: browser API adapter, event normalizer, ICS generator, ICS parser, sorter, types |
| **Content Script** | `src/extension/content-script.ts` | Injected into almedalsveckan.info; observes DOM and injects star buttons |
| **Background** | `src/extension/background.ts` | Manifest V3 service worker; manages storage and message dispatch |
| **Star Button** | `src/extension/star-button.ts` | Shadow DOM-isolated star toggle with scoped CSS |
| **Popup UI** | `src/ui/popup/` | Browser action popup showing starred events summary (React + Tailwind) |
| **Stars Page** | `src/ui/stars/` | Full-page starred events view with sort and ICS export (React + Tailwind) |
| **Manifest** | `src/extension/manifest/` | Base manifest + per-browser overrides, merged at build time |

### Key Design Decisions

- **Shadow DOM** for star buttons ensures complete style isolation from host page CSS
- **Browser API Adapter** wraps all `chrome.*` calls behind a testable interface
- **`#` path aliases** (`#core/*`, `#ui/*`, etc.) avoid conflicts with npm scoped packages
- **Tailwind CSS** is used only for Popup UI and Stars Page; star buttons use plain scoped CSS
- **`vite-plugin-web-extension`** handles multi-entry bundling and manifest processing

## Project Structure

```
src/
├── core/           # Shared pure-logic modules
├── extension/      # Content script, background, star button, manifest
├── ui/
│   ├── popup/      # Popup UI (React + Tailwind)
│   ├── stars/      # Stars page (React + Tailwind)
│   └── shared/     # Shared UI components
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
4. **Commit format**: `<type>(<scope>): <subject>` (see `.kiro/steering/commit-messages.md`)
5. **Lint and typecheck** must pass before committing
6. **Property-based tests** for core logic (ICS round-trip, sorter invariants, normalizer)

## License

MIT
