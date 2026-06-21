# Features Directory

This directory is reserved for the `#features/*` path alias. The project's feature architecture is distributed across three layers rather than isolated feature modules:

## Architecture Layers

### Core (`src/core/`)

Shared pure logic modules with no browser or UI dependencies. Includes event normalization, sorting, filtering, ICS generation/parsing, date formatting, storage validation, conflict detection, and locale messages. All core modules are unit-tested and property-tested.

### Extension (`src/extension/`)

Chrome extension integration layer running as content scripts and a background service worker:

- **Content script** — injects star buttons into almedalsveckan.info event cards using Shadow DOM isolation
- **Background** — service worker handling storage operations and message passing
- **Star button** — individual event starring with scoped CSS inside Shadow DOM
- **Bulk star** — coordinator, button, progress indicator, and rate-limiting logic for starring multiple events at once

### UI (`src/ui/`)

React-based user interfaces built with Tailwind CSS:

- **Popup** — compact starred-events list with ICS export
- **Stars page** — full-page view with search, sort, grid layout, and bulk actions
- **Shared components** — HelpModal, LanguageToggle, SortSelector, UndoToast, and hooks shared across popup and stars page

## Why Not Isolated Feature Modules?

Features like "star an event" span all three layers (content script injects the button, background persists the state, UI displays results). Composing features across layers with shared core logic proved more practical than self-contained feature directories for this extension's scale.

The `#features/*` path alias remains available for future self-contained modules that don't require cross-layer coordination.
