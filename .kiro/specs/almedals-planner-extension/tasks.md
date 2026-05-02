# Implementation Plan: Almedalsstjärnan Browser Extension

## Overview

This plan implements the Almedalsstjärnan Chrome extension from scratch using TypeScript, React, Vite, Tailwind CSS, and Manifest V3. The implementation follows strict TDD practices: tests are written before implementation code in every phase. The plan is organized into logical phases: project scaffolding, shared core modules, extension modules, UI surfaces, integration wiring, E2E tests, and CI/CD. All browser API access goes through the Browser API Adapter. Shadow DOM with plain scoped CSS is used for content script star buttons; Tailwind is used only for popup and stars page.

## Tasks

- [x] 1. Project scaffolding and configuration
  - [x] 1.1 Initialize pnpm project with package.json
    - Run `pnpm init` and configure package.json with name `almedalsstjarnan`, version `0.1.0`, `"type": "module"`, engines `{ "node": ">=20" }`, and all scripts: `dev`, `build`, `preview`, `typecheck`, `lint`, `lint:fix`, `format`, `format:check`, `test:unit`, `test:property`, `test:e2e`, `test`, `package`
    - _Requirements: 1.1, 1.2, 1.13, 1.14, 17.1, 17.2_

  - [x] 1.2 Create .nvmrc
    - Create `.nvmrc` with content `20`
    - _Requirements: 1.2_

  - [x] 1.3 Update .gitignore for extension project
    - Add `dist/`, `coverage/`, `.vite/`, `*.tsbuildinfo`, `pnpm-store/`, `*.zip` to the existing .gitignore
    - _Requirements: 1.10_

  - [x] 1.4 Install core dependencies
    - Install production deps: `react`, `react-dom`
    - Install dev deps: `typescript`, `vite`, `@vitejs/plugin-react`, `vite-plugin-web-extension`, `tailwindcss`, `postcss`, `autoprefixer`, `eslint`, `prettier`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `vitest`, `fast-check`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `playwright`, `@playwright/test`, `chrome-types`, `@types/react`, `@types/react-dom`
    - All versions pinned (exact) in package.json
    - _Requirements: 1.1, 1.3, 1.6, 1.7, 1.8_

  - [x] 1.5 Create tsconfig.json and tsconfig.node.json
    - Configure strict mode, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`, `jsx: "react-jsx"`, `moduleResolution: "bundler"`, path aliases `#core/*`, `#ui/*`, `#features/*`, `#extension/*`, `#test/*` as specified in design
    - Create tsconfig.node.json for Vite config files
    - _Requirements: 1.4, 1.5_

  - [x] 1.6 Create vite.config.ts
    - Configure `vite-plugin-web-extension` with manifest merge function, `@vitejs/plugin-react`, path alias resolution for all five `#` aliases, output to `dist/`, sourcemaps in dev only
    - _Requirements: 1.3, 1.5, 17.3, 17.4, 17.5_

  - [x] 1.7 Create vitest.config.ts
    - Configure jsdom environment, globals enabled, path aliases matching vite.config.ts, include patterns for `tests/unit/**/*.test.{ts,tsx}` and `tests/property/**/*.property.test.ts`, coverage provider v8 for `src/core/**/*.ts`, setupFiles pointing to `tests/helpers/mock-browser-api.ts`
    - _Requirements: 1.7, 18.2, 18.3_

  - [x] 1.8 Create tailwind.config.ts and postcss.config.cjs
    - Tailwind content scoped to `src/ui/popup/**`, `src/ui/stars/**`, `src/ui/shared/**` only — never content script
    - PostCSS config with tailwindcss and autoprefixer plugins
    - _Requirements: 1.8, 1.9_

  - [x] 1.9 Create .eslintrc.cjs and .prettierrc.json
    - ESLint with TypeScript parser, React plugin, React Hooks plugin, strict rules
    - Prettier with consistent formatting rules (singleQuote, trailingComma, semi)
    - _Requirements: 1.6_

  - [x] 1.10 Create playwright.config.ts
    - Configure Playwright for Chrome extension testing, test directory `tests/e2e/`, timeout settings
    - _Requirements: 1.7, 18.4_

  - [x] 1.11 Create extension icon placeholders
    - Create `icons/icon-16.png`, `icons/icon-32.png`, `icons/icon-48.png`, `icons/icon-128.png` as placeholder star icons at correct dimensions
    - _Requirements: 2.8_

  - [x] 1.12 Create directory structure
    - Create all directories: `src/core/`, `src/extension/manifest/`, `src/ui/popup/components/`, `src/ui/popup/hooks/`, `src/ui/stars/components/`, `src/ui/stars/hooks/`, `src/ui/shared/`, `src/features/`, `tests/unit/core/`, `tests/unit/extension/`, `tests/unit/ui/popup/`, `tests/unit/ui/stars/`, `tests/unit/ui/shared/`, `tests/property/`, `tests/e2e/`, `tests/helpers/`, `fixtures/`, `_locales/sv/`, `_locales/en/`, `.github/workflows/`
    - _Requirements: 19.4_

  - [x] 1.13 Create README.md
    - Write comprehensive README with: project purpose (Almedalsstjärnan extension), prerequisites (Node.js 20+, pnpm), setup instructions (`pnpm install`), available scripts table, architecture overview (6 modules), module descriptions, contribution guidelines
    - _Requirements: 1.11, 19.1_

  - [x] 1.14 Create .kiro/steering/coding-conventions.md (always included)
    - Write coding conventions steering file covering: TypeScript strict mode with noUncheckedIndexedAccess and noImplicitOverride, `readonly` for all interface properties, no `any` (use `unknown` and narrow), `const` assertions for literal types, discriminated unions for result types (ok/error pattern). Import ordering: external libs → #core → #extension → #ui → #features → #test → relative. Never use relative imports that cross module boundaries. Naming: kebab-case files, PascalCase types/interfaces, camelCase functions, UPPER_SNAKE_CASE constants. React: functional components only, Props interfaces named {Component}Props, hooks in dedicated hooks/ directories, no inline styles. CSS: Tailwind for popup and stars page ONLY, plain scoped CSS inside Shadow DOM for star buttons, no Tailwind in content script. File structure: one exported function/class per file where practical, test files mirror source structure.
    - _Requirements: 19.2_

  - [x] 1.15 Create .kiro/steering/testing-standards.md (always included)
    - Write testing standards steering file covering: TDD workflow (write failing test → minimal implementation → refactor → repeat), all tests mandatory (never optional), test file naming ({module}.test.ts for unit, {module}.property.test.ts for property, {flow}.e2e.test.ts for E2E). Unit tests: use Vitest, mock BrowserApiAdapter in ALL unit tests via the shared mock helper, never call real chrome.* APIs in tests, test both success and error paths, test edge cases (empty arrays, null fields, missing keys). Property-based tests: use fast-check with minimum 100 iterations (numRuns: 100), write custom arbitraries in tests/helpers/event-generators.ts, tag every property test with `// Feature: almedals-planner-extension, Property {N}: {title}`. E2E tests: use Playwright, build extension first then load unpacked, test only critical flows (star/unstar, ICS export). Coverage: all exported functions in src/core/ must have unit tests, coverage provider v8, exclude types.ts and index.ts from coverage. DOM testing: use fixtures/almedalsveckan-program-2026.html for content script tests, use tests/helpers/dom-helpers.ts for creating mock Event_Cards.
    - _Requirements: 19.2_

  - [x] 1.16 Create .kiro/steering/browser-extension-patterns.md (conditional: fileMatch src/extension/**, src/core/browser-api-adapter.ts)
    - Write browser extension patterns steering file with front-matter `inclusion: fileMatch` and `fileMatchPattern: 'src/extension/**'`. Content: all chrome.* API access must go through IBrowserApiAdapter — no direct chrome.* calls outside browser-api-adapter.ts. Content script isolation: content script runs in host page context, use Shadow DOM for all injected UI, mark processed elements with data-almedals-planner-initialized="1", one MutationObserver per document, never throw from content script (catch and log). Message passing: use the 6 defined MessageCommand types only, always send via adapter.sendMessage, always handle MessageResponseError, background service worker is the single source of truth for storage. Service worker lifecycle: service worker may be terminated and restarted by the browser, do not store state in module-level variables in background.ts, always read from storage.local. Star button: render inside Shadow DOM with open mode, use plain scoped CSS (no Tailwind), wire click handlers through callbacks (onStar/onUnstar), maintain eventId→StarButton[] map for cross-page consistency, listen to storage.onChanged for cross-tab consistency.
    - _Requirements: 19.2_

  - [x] 1.17 Create .kiro/steering/accessibility-standards.md (conditional: fileMatch src/ui/**, src/extension/star-button.*)
    - Write accessibility standards steering file with front-matter `inclusion: fileMatch` and `fileMatchPattern: 'src/ui/**'`. Content: WCAG 2.1 AA baseline. All interactive elements must be keyboard-reachable via Tab. Buttons must activate on Enter and Space. Star button: use aria-pressed (true/false) to reflect starred state, use aria-label with localized "Star event"/"Unstar event", 32px minimum touch/click target, 16px icon, focus-visible outline 2px solid #2563eb with 2px offset. Sort selector: use native HTML <select> element (inherits keyboard behavior and ARIA), add aria-label from localized sortLabel key. Contrast: all text and interactive elements must meet 4.5:1 contrast ratio for normal text, 3:1 for large text. Focus indicators: visible focus outline on all interactive elements, minimum 2px width. Empty states: use appropriate heading level, provide instructional text. Links: title cells in stars page must be <a> elements opening source_url in new tab with appropriate link text.
    - _Requirements: 19.2_

  - [x] 1.18 Create .kiro/steering/i18n-guide.md (conditional: fileMatch _locales/**, src/**/*.tsx)
    - Write i18n guide steering file with front-matter `inclusion: fileMatch` and `fileMatchPattern: '**/*.tsx'`. Content: all user-facing strings must use message keys from _locales/{locale}/messages.json. Access strings via adapter.getMessage(key) — never hardcode UI text in React components, content scripts, or manifests. Swedish (sv) is the default locale. English (en) is the secondary locale. If browser language is neither sv nor en, display Swedish. Adding a new string: add the key to BOTH _locales/sv/messages.json and _locales/en/messages.json with message and description fields. Do NOT localize: event content from the host page (titles, descriptions, locations, organiser names, topic names, source URLs), the export filename pattern, ICS field names. DO localize: the source label in ICS DESCRIPTION ("Källa:" for sv, "Source:" for en). Manifest uses __MSG_extensionName__ and __MSG_extensionDescription__ references. Reference the i18n catalog at .kiro/specs/almedals-planner-extension/i18n-catalog.md for the complete key list.
    - _Requirements: 19.2_

  - [x] 1.19 Create .kiro/steering/commit-messages.md (always included)
    - Write commit message format steering file with: structure (`<type>(<scope>): <subject>` with optional body), types (feat, fix, test, refactor, docs, chore, style), scopes (core, content, background, popup, stars, manifest, i18n, ci, config), rules (imperative mood, lowercase, no period, max 70 chars subject, wrap body at 72 chars, reference requirements with "Implements Req X.Y" or "Validates Req X.Y"). Git workflow rule: after completing each top-level task (e.g., all of task 5, all of task 8), stage all changed files, commit with a message referencing the task number (e.g., `feat(core): implement browser API adapter [Task 5]`), and push to the current branch. Do not batch multiple top-level tasks into a single commit. Sub-tasks within the same top-level task may share a commit.
    - _Requirements: 19.2_

  - [x] 1.20 Verify project scaffolding
    - Run `pnpm install`, `pnpm run typecheck`, `pnpm run lint` to confirm zero errors on empty project
    - _Requirements: 1.1, 1.4, 1.6_

- [x] 2. Checkpoint — Verify project scaffolding
  - Ensure `pnpm install` succeeds, `pnpm run typecheck` passes, `pnpm run lint` passes.

- [x] 3. Shared core types and i18n locale files
  - [x] 3.1 Create src/core/types.ts
    - Implement all TypeScript interfaces and types exactly as specified in design: `EventId`, `SortOrder`, `SORT_ORDERS`, `DEFAULT_SORT_ORDER`, `NormalizedEvent`, `StarredEvent` (extends NormalizedEvent with `starred: true` and `starredAt: string`), `StorageSchema`, `MESSAGE_COMMANDS`, `MessageCommand`, all six payload interfaces, `MessagePayload` union, `MessageResponse`, `MessageResponseSuccess`, `MessageResponseError`, response type map, `NormalizerResult`, `NormalizerSuccess`, `NormalizerError`, `ICSEvent`, `ICSCalendar`, `IBrowserApiAdapter` (including `onStorageChanged` method that registers a listener for `chrome.storage.onChanged` and returns an unsubscribe function)
    - _Requirements: 6.2, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 11.1, 12.4, 13.1, 13.2_

  - [x] 3.2 Create src/core/index.ts barrel export
    - Re-export all public types and functions from core modules
    - _Requirements: 19.4_

  - [x] 3.3 Create _locales/sv/messages.json
    - Write the complete Swedish locale file with all 26 message keys exactly as defined in the i18n catalog: `extensionName`, `extensionDescription`, `starEvent`, `unstarEvent`, `popupTitle`, `starsPageTitle`, `openFullList`, `exportToCalendar`, `sortChronological`, `sortReverseChronological`, `sortAlphabeticalTitle`, `sortAlphabeticalOrganiser`, `sortLabel`, `emptyStateTitle`, `emptyStateMessage`, `unstarAction`, `icsSourceLabel`, `errorStorageFailed`, `errorExportFailed`, `successExport`, `columnTitle`, `columnOrganiser`, `columnDateTime`, `columnLocation`, `columnTopic`, `columnActions`
    - _Requirements: 3.1, 3.2, 3.4, 3.6, 3.7_

  - [x] 3.4 Create _locales/en/messages.json
    - Write the complete English locale file with all 26 message keys exactly as defined in the i18n catalog
    - _Requirements: 3.1, 3.3, 3.6, 3.7_

  - [x] 3.5 Create DOM fixture file fixtures/almedalsveckan-program-2026.html
    - Create a representative HTML fixture containing multiple Event_Card elements with realistic Almedalsveckan programme structure, including cards with all fields, cards with missing optional fields, and at least one malformed card for error-path testing
    - ⚠️ HUMAN REVIEW REQUIRED: The user must verify this fixture against the live almedalsveckan.info site before proceeding. This fixture is the ground truth for all content script and event normalizer tests. If the DOM structure is wrong, every downstream test validates against incorrect assumptions. Do not proceed to task 4 until the user confirms the fixture is accurate.
    - _Requirements: 18.5_

- [x] 4. Test helpers
  - [x] 4.1 Create tests/helpers/mock-browser-api.ts
    - Implement a mock `IBrowserApiAdapter` using `vi.fn()` for all seven methods: `storageLocalGet`, `storageLocalSet`, `sendMessage`, `getMessage`, `download`, `createTab`, `onStorageChanged` (returns a mock unsubscribe function). Export the mock instance and a `resetMocks()` utility. This file is auto-loaded via vitest setupFiles.
    - _Requirements: 13.4, 18.10_

  - [x] 4.2 Create tests/helpers/event-generators.ts
    - Implement `fast-check` arbitraries: `normalizedEventArb` (generates valid `NormalizedEvent` with realistic field values), `starredEventArb` (extends with `starredAt`), `sortOrderArb` (one of four valid values), `starredEventArrayArb` (0–50 items with unique IDs)
    - _Requirements: 18.3, 18.6, 18.7, 18.8_

  - [x] 4.3 Create tests/helpers/dom-helpers.ts
    - Implement `createMockEventCard(overrides?)` that builds a DOM element matching the almedalsveckan.info Event_Card structure, and `loadFixture()` that reads and parses `fixtures/almedalsveckan-program-2026.html`
    - _Requirements: 18.5, 18.10_

- [x] 5. Browser API Adapter
  - [x] 5.1 Write unit tests for Browser API Adapter
    - Create `tests/unit/core/browser-api-adapter.test.ts` testing: `storageLocalGet` delegates to `chrome.storage.local.get`, `storageLocalSet` delegates to `chrome.storage.local.set`, `sendMessage` delegates to `chrome.runtime.sendMessage`, `getMessage` delegates to `chrome.i18n.getMessage`, `download` delegates to `chrome.downloads.download`, `createTab` delegates to `chrome.tabs.create`, `onStorageChanged` registers a listener on `chrome.storage.onChanged.addListener` and returns an unsubscribe function that calls `chrome.storage.onChanged.removeListener`, error wrapping (rejects with descriptive error including method name), Promise-based interface for all async methods
    - _Requirements: 13.1, 13.2, 13.3, 13.5_

  - [x] 5.2 Implement src/core/browser-api-adapter.ts
    - Implement `BrowserApiAdapter` class implementing `IBrowserApiAdapter`, wrapping all seven methods (storageLocalGet, storageLocalSet, sendMessage, getMessage, download, createTab, onStorageChanged) with Promise-based interface and descriptive error rejection. `onStorageChanged` wraps `chrome.storage.onChanged.addListener` and returns an unsubscribe function. Implement `createBrowserApiAdapter()` factory function. This is the SOLE module referencing `chrome.*` globals.
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 6. Manifest configuration
  - [x] 6.1 Write unit tests for manifest merge
    - Create `tests/unit/extension/merge-manifest.test.ts` testing: simple key override, nested object deep merge, array replacement (not concatenation), keys from both objects present, override precedence for conflicting keys
    - _Requirements: 2.9, 17.3_

  - [x] 6.2 Write property test for manifest merge (Property 14)
    - Create `tests/property/manifest-merge.property.test.ts` using fast-check to verify: all keys from both objects present in result, override values take precedence, nested objects recursively merged. Min 100 iterations.
    - **Property 14: Manifest merge precedence**
    - **Validates: Requirements 2.9, 17.3**
    - _Requirements: 2.9, 17.3_

  - [x] 6.3 Implement src/extension/manifest/merge-manifest.ts
    - Implement `mergeManifest(base, override)` with simple deep-merge: arrays replaced, nested objects recursively merged, override takes precedence
    - _Requirements: 2.9, 17.3_

  - [x] 6.4 Create src/extension/manifest/base.json
    - Write the base manifest exactly as specified in design: manifest_version 3, `__MSG_extensionName__`, `__MSG_extensionDescription__`, version 0.1.0, default_locale "sv", permissions ["storage", "downloads", "tabs"], host_permissions ["*://almedalsveckan.info/*"], background service_worker, content_scripts matching almedalsveckan.info, action with default_popup and icons, icons object
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.10, 16.1, 16.2, 16.3_

  - [x] 6.5 Create src/extension/manifest/chrome.json
    - Write Chrome override with `minimum_chrome_version: "110"`
    - _Requirements: 2.9, 17.8_

- [ ] 7. Checkpoint — Verify core types, i18n, test helpers, adapter, and manifest
  - Ensure all tests pass (`pnpm run test:unit`, `pnpm run test:property`), typecheck passes.

- [ ] 8. ICS Parser (needed by Event Normalizer — must be implemented first)
  - [ ] 8.1 Write unit tests for ICS Parser
    - Create `tests/unit/core/ics-parser.test.ts` testing: parse valid VCALENDAR with single VEVENT, parse multiple VEVENTs, extract UID/DTSTART/DTEND/SUMMARY/LOCATION/DESCRIPTION/ORGANIZER fields, unfold continuation lines, unescape ICS text values, throw on malformed ICS, handle missing optional fields (DTEND, LOCATION, DESCRIPTION, ORGANIZER)
    - _Requirements: 12.8_

  - [ ] 8.2 Implement src/core/ics-parser.ts
    - Implement `parseICS(icsContent)`, `unfoldLines(content)`, and `unescapeICSText(text)` as specified in design. Parse ICS string into `ICSCalendar` with `ICSEvent[]`.
    - _Requirements: 12.8_

- [ ] 9. Event Normalizer (depends on ICS Parser for data:text/calendar decoding)
  - [ ] 9.1 Write unit tests for Event Normalizer
    - Create `tests/unit/core/event-normalizer.test.ts` testing: extraction of all fields (id, title, organiser, startDateTime, endDateTime, location, description, topic, sourceUrl, icsDataUri) from a well-formed Event_Card, decoding the `data:text/calendar` data URI and parsing the embedded ICS content via ICS Parser to extract SUMMARY/DTSTART/DTEND/LOCATION/DESCRIPTION/URL fields, preferring ICS SUMMARY as title over visible DOM title, error result for missing required fields (id, title, startDateTime), null/empty values for missing optional fields, whitespace trimming on all string fields, date-time parsing to ISO 8601 with timezone, `deriveEventId` priority chain (ICS URL > detail URL > SHA-256 hash), `parseDateTime` with various time formats, skip malformed cards without throwing
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [ ] 9.2 Write property tests for Event Normalizer (Properties 6, 7)
    - Create `tests/property/normalizer-trim.property.test.ts`: for any Event_Card with whitespace-padded string fields, normalizeEvent produces trimmed values. Min 100 iterations.
    - **Property 6: Normalizer whitespace trimming**
    - **Validates: Requirements 6.5**
    - Create `tests/property/normalizer-required-fields.property.test.ts`: for any Event_Card missing required fields, normalizeEvent returns NormalizerError. Min 100 iterations.
    - **Property 7: Normalizer required field rejection**
    - **Validates: Requirements 6.3**
    - _Requirements: 6.3, 6.5, 18.3_

  - [ ] 9.3 Implement src/core/event-normalizer.ts
    - Implement `normalizeEvent(element)`, `deriveEventId(icsUrl, detailUrl, title, startDateTime)`, and `parseDateTime(timeText)` as specified in design. Extract fields from DOM elements. Decode the `data:text/calendar` data URI (UTF-8), parse the embedded ICS content using `parseICS` from `#core/ics-parser`, and use the parsed ICS fields (SUMMARY, DTSTART, DTEND, LOCATION, DESCRIPTION, URL) as the primary data source. Prefer ICS SUMMARY as title; fall back to visible DOM title if SUMMARY is absent. Validate required fields, trim whitespace, parse dates to ISO 8601, return `NormalizerResult` discriminated union.
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [ ] 10. Sorter
  - [ ] 10.1 Write unit tests for Sorter
    - Create `tests/unit/core/sorter.test.ts` testing: chronological sort (startDateTime ascending), reverse-chronological sort (startDateTime descending), alphabetical-by-title sort (locale-aware ascending), starred-desc sort (starredAt descending, tiebreaker startDateTime ascending), tiebreaker consistency for all sort orders, non-mutation of input array, empty array handling, single-element array
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

  - [ ] 10.2 Write property tests for Sorter (Properties 2, 3, 4, 5)
    - Create `tests/property/sorter-idempotence.property.test.ts`: sorting twice produces same result as sorting once. Min 100 iterations.
    - **Property 2: Sorter idempotence**
    - **Validates: Requirements 11.8, 18.7**
    - Create `tests/property/sorter-length.property.test.ts`: output length equals input length. Min 100 iterations.
    - **Property 3: Sorter length preservation**
    - **Validates: Requirements 11.7, 18.8**
    - Create `tests/property/sorter-ordering.property.test.ts`: each adjacent pair satisfies the sort order's comparison. Min 100 iterations.
    - **Property 4: Sorter ordering correctness**
    - **Validates: Requirements 11.2, 11.3, 11.4, 11.5, 11.6**
    - Create `tests/property/sorter-non-mutation.property.test.ts`: original array unchanged after sort. Min 100 iterations.
    - **Property 5: Sorter non-mutation**
    - **Validates: Requirements 11.7**
    - _Requirements: 11.7, 11.8, 18.3, 18.7, 18.8_

  - [ ] 10.3 Implement src/core/sorter.ts
    - Implement `sortEvents(events, order)` returning a new sorted array. Support all four sort orders: chronological (startDateTime ascending), reverse-chronological (startDateTime descending), alphabetical-by-title (locale-aware title ascending), starred-desc (starredAt descending with startDateTime ascending tiebreaker). Never mutate input.
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8_

- [ ] 11. ICS Generator
  - [ ] 11.1 Write unit tests for ICS Generator
    - Create `tests/unit/core/ics-generator.test.ts` testing: VCALENDAR header (VERSION:2.0, PRODID:-//Almedalsstjärnan//EN, CALSCALE:GREGORIAN, METHOD:PUBLISH), VEVENT fields (UID as {id}@almedalsstjarnan, DTSTAMP in YYYYMMDDTHHMMSSZ format, DTSTART, DTEND, SUMMARY, LOCATION, DESCRIPTION with localized source label, ORGANIZER), CRLF line endings throughout, line folding at 75 octets, `escapeICSText` for commas/semicolons/backslashes/newlines, `foldLine` correctness, `generateExportFilename` pattern (almedalsstjarnan-starred-events-YYYYMMDD-HHMMSS.ics), empty events array produces valid VCALENDAR with zero VEVENTs, Swedish source label "Källa:", English source label "Source:"
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 3.10_

  - [ ] 11.2 Write property tests for ICS (Properties 1, 8, 9, 10, 11)
    - Create `tests/property/ics-roundtrip.property.test.ts`: generate ICS then parse produces equivalent events. Min 100 iterations.
    - **Property 1: ICS round-trip preservation**
    - **Validates: Requirements 12.1, 12.3, 12.8, 12.9, 18.6**
    - Create `tests/property/ics-crlf.property.test.ts`: no bare LF in output. Min 100 iterations.
    - **Property 8: ICS CRLF line endings**
    - **Validates: Requirements 12.5**
    - Create `tests/property/ics-line-folding.property.test.ts`: all content lines ≤ 75 octets. Min 100 iterations.
    - **Property 9: ICS line folding**
    - **Validates: Requirements 12.6**
    - Create `tests/property/ics-uid-format.property.test.ts`: UID matches {id}@almedalsstjarnan. Min 100 iterations.
    - **Property 10: ICS UID format**
    - **Validates: Requirements 12.4**
    - Create `tests/property/ics-filename.property.test.ts`: filename matches regex pattern. Min 100 iterations.
    - **Property 11: ICS export filename pattern**
    - **Validates: Requirements 12.7**
    - _Requirements: 12.1, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.9, 18.3, 18.6_

  - [ ] 11.3 Implement src/core/ics-generator.ts
    - Implement `generateICS(events, locale)`, `foldLine(line)`, `escapeICSText(text)`, and `generateExportFilename(now?)` as specified in design. VCALENDAR header with PRODID:-//Almedalsstjärnan//EN, each VEVENT includes DTSTAMP (export generation timestamp in YYYYMMDDTHHMMSSZ format), CRLF line endings, RFC 5545 line folding, UID format {id}@almedalsstjarnan, localized source label in DESCRIPTION, export filename pattern almedalsstjarnan-starred-events-YYYYMMDD-HHMMSS.ics.
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

- [ ] 12. Checkpoint — Verify all shared core modules
  - Ensure all unit tests and property tests pass (`pnpm run test:unit`, `pnpm run test:property`), typecheck passes.

- [ ] 13. Background Service Worker
  - [ ] 13.1 Write unit tests for Background Service Worker
    - Create `tests/unit/extension/background.test.ts` testing: STAR_EVENT handler adds event to storage with `starred: true` and a generated `starredAt` ISO 8601 UTC timestamp and responds success, UNSTAR_EVENT handler removes event from storage and responds success, GET_STAR_STATE returns true for starred event and false for unstarred, GET_ALL_STARRED_EVENTS returns array of all starred events (converted from object via Object.values), GET_SORT_ORDER returns current sort order from storage, GET_SORT_ORDER returns "chronological" when key missing, SET_SORT_ORDER persists sort order and responds success, starredEvents defaults to empty array when key missing, storage failure returns MessageResponseError with descriptive message, unknown command returns error response, STAR_EVENT handler converts NormalizedEvent to StarredEvent by adding `starred` and `starredAt` fields. All tests use mocked BrowserApiAdapter.
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 8.8_

  - [ ] 13.2 Write property tests for Background (Properties 15, 16)
    - Create `tests/property/background-star-roundtrip.property.test.ts`: STAR_EVENT then GET_STAR_STATE returns true, then UNSTAR_EVENT then GET_STAR_STATE returns false. Min 100 iterations.
    - **Property 15: Background star/unstar round-trip**
    - **Validates: Requirements 7.2, 7.3, 7.4**
    - Create `tests/property/background-sort-roundtrip.property.test.ts`: SET_SORT_ORDER then GET_SORT_ORDER returns same value. Min 100 iterations.
    - **Property 16: Background sort order round-trip**
    - **Validates: Requirements 7.6, 7.7**
    - _Requirements: 7.2, 7.3, 7.4, 7.6, 7.7, 18.3_

  - [ ] 13.3 Implement src/extension/background.ts
    - Implement background service worker with `chrome.runtime.onMessage` listener dispatching to handler functions for all six commands. Use BrowserApiAdapter for all storage operations. Apply defaults (empty object for starredEvents, "chronological" for sortOrder). Wrap all handlers in try/catch returning MessageResponseError on failure. STAR_EVENT handler must convert the incoming NormalizedEvent to a StarredEvent by adding `starred: true` and `starredAt: new Date().toISOString()` before persisting.
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 8.1, 8.8, 8.9, 8.10_

- [ ] 14. Star Button (Shadow DOM)
  - [ ] 14.1 Write unit tests for Star Button
    - Create `tests/unit/extension/star-button.test.ts` testing: creates Shadow DOM on host element, renders button with correct initial aria-pressed state, renders outlined SVG when unstarred, renders filled SVG when starred, aria-label set to localized "Star event" when unstarred, aria-label set to localized "Unstar event" when starred, click calls onStar callback when unstarred, click calls onUnstar callback when starred, update(true) switches to starred state, update(false) switches to unstarred state, destroy() removes Shadow DOM content, button is focusable (tabindex), button activates on Enter and Space, 32px minimum clickable area, 16px SVG icon
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 14.1, 14.2, 14.3, 14.4_

  - [ ] 14.2 Write property test for Star Button ARIA (Property 13)
    - Create `tests/property/star-button-aria.property.test.ts`: for any starred/unstarred state, aria-pressed and aria-label are correct. Min 100 iterations.
    - **Property 13: Star button ARIA state correctness**
    - **Validates: Requirements 5.4, 5.5, 14.3, 14.4**
    - _Requirements: 5.4, 5.5, 14.3, 14.4_

  - [ ] 14.3 Create src/extension/star-button.css
    - Write plain scoped CSS for Shadow DOM: `.star-btn` with 32px clickable area, transparent background, hover state, focus-visible outline (2px solid #2563eb), SVG 16px, filled star color #f59e0b when aria-pressed="true", outlined stroke #6b7280 when aria-pressed="false". No Tailwind.
    - _Requirements: 1.9, 5.1, 14.7_

  - [ ] 14.4 Implement src/extension/star-button.ts
    - Implement `createStarButton(hostElement, options)` returning `{ update, destroy }`. Create Shadow DOM (open mode), inject scoped CSS from star-button.css, render button with inline SVG (16px viewBox star path), wire click handler to toggle star/unstar via callbacks, set aria-pressed and aria-label based on state. Export `STAR_OUTLINED_SVG` and `STAR_FILLED_SVG` constants.
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 14.1, 14.2, 14.3, 14.4_

- [ ] 15. Content Script
  - [ ] 15.1 Write unit tests for Content Script
    - Create `tests/unit/extension/content-script.test.ts` testing: `initContentScript` scans existing DOM for Event_Cards and injects Star_Buttons, creates exactly one MutationObserver, MutationObserver callback processes new Event_Cards, sets `data-almedals-planner-initialized="1"` after injection, skips cards already marked with `data-almedals-planner-initialized="1"`, skips cards where normalizeEvent returns error (no throw), `isEventCard` correctly identifies Event_Card elements, `findEventCards` returns all Event_Cards in a root, `processEventCard` sends GET_STAR_STATE to determine initial state, maintains an internal `eventId → StarButton[]` map so that when one star button is toggled all other visible star buttons for the same event ID update within the same tab (cross-page consistency), registers an `onStorageChanged` listener via adapter that updates all visible star buttons when `starredEvents` changes externally (cross-tab consistency), uses DOM fixture for realistic testing. All tests use mocked BrowserApiAdapter.
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 20.1, 20.2, 20.3_

  - [ ] 15.2 Write property test for Content Script injection idempotence (Property 12)
    - Create `tests/property/content-script-idempotence.property.test.ts`: running injection twice produces same number of Star_Buttons as once. Min 100 iterations.
    - **Property 12: Content script injection idempotence**
    - **Validates: Requirements 4.4, 4.5, 20.3**
    - _Requirements: 4.4, 4.5, 20.3_

  - [ ] 15.3 Implement src/extension/content-script.ts
    - Implement `initContentScript(adapter)`, `processEventCard(card, adapter)`, `isEventCard(element)`, `findEventCards(root)`. On load: scan DOM, inject Star_Buttons in Shadow DOM. Create one MutationObserver (childList, subtree) on document.body. Process new cards on mutation. Mark processed cards with `data-almedals-planner-initialized="1"`. Skip already-initialized cards. Skip cards where normalizeEvent fails (log warning, no throw). Send GET_STAR_STATE for initial button state. Wire star/unstar click handlers to send STAR_EVENT/UNSTAR_EVENT messages. Maintain an internal `Map<EventId, StarButton[]>` so that after toggling one star button, all other visible star buttons for the same event ID are updated immediately (cross-page consistency within same tab). Register an `adapter.onStorageChanged` listener that, when `starredEvents` changes, iterates all tracked star buttons and updates their visual state to match the new storage state (cross-tab consistency).
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 5.6, 5.7, 5.8, 5.9, 5.10, 20.1, 20.2, 20.3, 20.4_

- [ ] 16. Checkpoint — Verify extension modules (background, star button, content script)
  - Ensure all tests pass (`pnpm run test:unit`, `pnpm run test:property`), typecheck passes.
  - ⚠️ HUMAN REVIEW REQUIRED: Build the extension (`pnpm run build`), load it as unpacked in Chrome, and visually verify the star button on almedalsveckan.info: (1) outlined star icon is visible at 16px inside a 32px clickable area, (2) clicking toggles to filled star, (3) clicking again toggles back to outlined, (4) focus ring is visible when tabbing to the button, (5) hover state shows subtle background. Do not proceed to task 17 until the user confirms the star button renders correctly.
  - 🔄 START A NEW CHAT SESSION after this checkpoint before proceeding to task 17. This keeps context fresh for the next batch of tasks.
  - 🔄 START A NEW CHAT SESSION after this checkpoint before proceeding to task 17. This keeps context fresh for the next batch of tasks.

- [ ] 17. Shared UI components
  - [ ] 17.1 Write unit tests for shared SortSelector component
    - Create `tests/unit/ui/shared/SortSelector.test.tsx` testing: renders native HTML select element, displays all four sort options with localized labels (via mocked getMessage), calls onChange callback when selection changes, reflects current sort order as selected value, uses aria-label from localized sortLabel key, keyboard navigable (Tab, Enter, Space)
    - _Requirements: 9.5, 10.4, 14.5, 14.6, 14.8_

  - [ ] 17.2 Implement src/ui/shared/SortSelector.tsx
    - Implement shared `SortSelector` React component used by both Popup and Stars Page. Native HTML `<select>` element with four options (chronological, reverse-chronological, alphabetical-by-title, starred-desc). All labels via `chrome.i18n.getMessage` through adapter. Props: `currentOrder`, `onOrderChange`, `adapter`.
    - _Requirements: 9.5, 10.4, 14.8_

- [ ] 18. Popup UI
  - [ ] 18.1 Create src/ui/popup/popup.html
    - Create popup HTML entry point with root div, script tag pointing to popup.tsx, link to popup.css. Set `<html lang>` dynamically or use default.
    - _Requirements: 2.8, 9.1_

  - [ ] 18.2 Create src/ui/popup/popup.tsx and popup.css
    - Create React entry point rendering App into root div. Import Tailwind via popup.css (`@tailwind base; @tailwind components; @tailwind utilities;`).
    - _Requirements: 9.10, 9.11_

  - [ ] 18.3 Write unit tests for Popup App
    - Create `tests/unit/ui/popup/App.test.tsx` testing: sends GET_ALL_STARRED_EVENTS and GET_SORT_ORDER on mount, displays up to 20 starred events, displays each event with title/organiser/date-time/location, renders SortSelector with current sort order, changing sort order sends SET_SORT_ORDER and re-sorts list, displays "Open full list" button, clicking "Open full list" calls createTab with stars.html URL, displays localized empty state when no starred events, renders at 360px width, uses Tailwind classes for styling, keyboard navigable (Tab, Shift+Tab, Enter, Space), registers an `onStorageChanged` listener via adapter that re-fetches and re-renders the event list when `starredEvents` changes externally (live update from content script or other tabs)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10, 9.11, 14.5_

  - [ ] 18.4 Implement src/ui/popup/App.tsx
    - Implement main Popup App component: on mount send GET_ALL_STARRED_EVENTS and GET_SORT_ORDER via adapter, display up to 20 events sorted by current order using Sorter, render SortSelector, handle sort order change (send SET_SORT_ORDER, re-sort), render "Open full list" button (opens stars.html via createTab), render empty state when no events. Register an `adapter.onStorageChanged` listener that re-fetches starred events and re-renders the list when `starredEvents` changes externally. Clean up the listener on unmount. All strings via i18n.
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9_

  - [ ] 18.5 Implement Popup sub-components
    - Create `src/ui/popup/components/EventList.tsx`: renders list of events (max 20)
    - Create `src/ui/popup/components/EventItem.tsx`: renders single event with title, organiser, date-time, location
    - Create `src/ui/popup/components/EmptyState.tsx`: renders localized empty state message
    - Create `src/ui/popup/hooks/useStarredEvents.ts`: custom hook encapsulating fetch and sort logic
    - _Requirements: 9.3, 9.4, 9.9_

- [ ] 19. Stars Page
  - [ ] 19.1 Create src/ui/stars/stars.html
    - Create stars page HTML entry point with root div, script tag pointing to stars.tsx, link to stars.css.
    - _Requirements: 10.1_

  - [ ] 19.2 Create src/ui/stars/stars.tsx and stars.css
    - Create React entry point rendering App into root div. Import Tailwind via stars.css.
    - _Requirements: 10.11, 10.12_

  - [ ] 19.3 Write unit tests for Stars Page App
    - Create `tests/unit/ui/stars/App.test.tsx` testing: sends GET_ALL_STARRED_EVENTS and GET_SORT_ORDER on mount, displays all starred events in 6-column grid (title, organiser, date-time, location, topic, actions), renders SortSelector with current sort order, changing sort order sends SET_SORT_ORDER and re-sorts, displays export button with localized "Export to calendar" label, clicking export triggers ICS generation and download with correct filename pattern, displays unstar action per event row, clicking unstar sends UNSTAR_EVENT and removes event from list, displays localized empty state when no events, uses Tailwind classes, keyboard navigable, column headers use localized labels (columnTitle, columnOrganiser, columnDateTime, columnLocation, columnTopic, columnActions), registers an `onStorageChanged` listener via adapter that re-fetches and re-renders the event list when `starredEvents` changes externally (live update from content script or other tabs)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10, 10.11, 10.12, 14.6_

  - [ ] 19.4 Implement src/ui/stars/App.tsx
    - Implement main Stars Page App component: on mount send GET_ALL_STARRED_EVENTS and GET_SORT_ORDER, display all events in 6-column grid sorted by current order, render SortSelector, handle sort order change, render export button (generates ICS via generateICS, creates Blob URL, triggers download via adapter with filename from generateExportFilename), render unstar action per row (sends UNSTAR_EVENT, removes from list), render empty state. Register an `adapter.onStorageChanged` listener that re-fetches starred events and re-renders the list when `starredEvents` changes externally. Clean up the listener on unmount. All strings via i18n.
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10_

  - [ ] 19.5 Implement Stars Page sub-components
    - Create `src/ui/stars/components/EventGrid.tsx`: renders 6-column grid with header row using localized column labels
    - Create `src/ui/stars/components/EventRow.tsx`: renders single event row with all six columns including unstar action
    - Create `src/ui/stars/components/ExportButton.tsx`: renders export button, handles ICS generation and download
    - Create `src/ui/stars/components/EmptyState.tsx`: renders localized empty state
    - Create `src/ui/stars/hooks/useStarredEvents.ts`: custom hook for fetch, sort, unstar, and export logic
    - _Requirements: 10.3, 10.6, 10.7, 10.8, 10.9, 10.10_

- [ ] 20. Checkpoint — Verify all UI components
  - Ensure all tests pass (`pnpm run test:unit`, `pnpm run test:property`), typecheck passes.
  - ⚠️ HUMAN REVIEW REQUIRED: Build the extension, load as unpacked in Chrome, and visually verify: (1) Popup opens at 360px width with correct layout — title, event count, sort selector, event list, "Open full list" button, (2) Popup shows localized empty state when no events are starred, (3) Stars page opens from popup in a new tab, (4) Stars page shows 6-column grid with correct column headers, (5) Sort selector works in both popup and stars page, (6) Export button is visible and labeled correctly, (7) All text is in Swedish (default locale). Do not proceed to task 21 until the user confirms both UI surfaces render correctly.
  - 🔄 START A NEW CHAT SESSION after this checkpoint before proceeding to task 21. This keeps context fresh for the next batch of tasks.
  - 🔄 START A NEW CHAT SESSION after this checkpoint before proceeding to task 21. This keeps context fresh for the next batch of tasks.

- [ ] 21. Integration wiring and cross-module imports
  - [ ] 21.1 Wire content script entry point
    - Ensure `src/extension/content-script.ts` imports and calls `initContentScript` with a real `BrowserApiAdapter` instance on load. Verify the content script bundle is self-contained and uses `#core/*` and `#extension/*` path aliases for all cross-module imports.
    - _Requirements: 4.1, 8.9, 17.4_

  - [ ] 21.2 Wire background service worker entry point
    - Ensure `src/extension/background.ts` registers the `chrome.runtime.onMessage` listener on load with a real `BrowserApiAdapter` instance. Verify it uses `#core/*` path aliases.
    - _Requirements: 7.1, 8.9, 8.10, 17.4_

  - [ ] 21.3 Wire Popup UI to background via message passing
    - Ensure Popup App sends messages via `BrowserApiAdapter.sendMessage` for GET_ALL_STARRED_EVENTS, GET_SORT_ORDER, SET_SORT_ORDER. Verify the popup entry point creates a real adapter instance and passes it through component tree.
    - _Requirements: 8.9, 8.10, 9.2, 9.6_

  - [ ] 21.4 Wire Stars Page to background and ICS generator
    - Ensure Stars Page App sends messages via adapter for GET_ALL_STARRED_EVENTS, GET_SORT_ORDER, SET_SORT_ORDER, UNSTAR_EVENT. Ensure export flow calls `generateICS` from `#core/ics-generator`, creates Blob URL, and calls `adapter.download` with filename from `generateExportFilename`. Verify all cross-module imports use `#core/*` aliases.
    - _Requirements: 8.9, 8.10, 10.2, 10.5, 10.7, 12.7_

  - [ ] 21.5 Update src/core/index.ts barrel exports
    - Ensure index.ts re-exports all public functions and types from: types, browser-api-adapter, event-normalizer, ics-generator, ics-parser, sorter
    - _Requirements: 19.4_

- [ ] 22. Kiro hooks
  - [ ] 22.1 Create Kiro hook: lint on file save
    - Create `.kiro/hooks/lint-on-save.kiro.md` hook configuration: event `fileEdited`, file patterns `src/**/*.ts, src/**/*.tsx`, action `askAgent`, prompt "Run `pnpm run lint` and report any errors. If there are fixable errors, run `pnpm run lint:fix` and report what was fixed."
    - _Requirements: 19.3_

  - [ ] 22.2 Create Kiro hook: typecheck on file save
    - Create `.kiro/hooks/typecheck-on-save.kiro.md` hook configuration: event `fileEdited`, file patterns `src/**/*.ts, src/**/*.tsx`, action `askAgent`, prompt "Run `pnpm run typecheck` and report any type errors found."
    - _Requirements: 19.3_

  - [ ] 22.3 Create Kiro hook: run related tests on file save
    - Create `.kiro/hooks/test-on-save.kiro.md` hook configuration: event `fileEdited`, file patterns `src/**/*.ts, src/**/*.tsx, tests/**/*.test.ts, tests/**/*.test.tsx`, action `askAgent`, prompt "Identify the test file(s) related to the edited file and run them with `pnpm exec vitest run --reporter=verbose {test_file}`. Report pass/fail results."
    - _Requirements: 19.3_

- [ ] 23. CI pipeline and build/package scripts
  - [ ] 23.1 Create .github/workflows/ci.yml
    - Write GitHub Actions CI workflow: trigger on push to main and pull requests, ubuntu-latest runner, Node.js 20, pnpm 9 with action-setup, install with --frozen-lockfile, run lint, typecheck, test:unit, test:property, build, verify bundle sizes (content-script.js < 50KB, total dist < 500KB). Fail on any error.
    - _Requirements: 1.12, 17.6, 17.7, 15.5, 15.6_

  - [ ] 23.2 Verify build produces correct dist/ output
    - Run `pnpm run build` and verify dist/ contains: manifest.json (merged), _locales/sv/messages.json, _locales/en/messages.json, background.js, content-script.js, popup.html, popup.js, popup.css, stars.html, stars.js, stars.css, icons/icon-*.png. Verify content-script.js < 50KB, total dist < 500KB.
    - _Requirements: 17.1, 17.3, 17.4, 17.5, 15.5, 15.6_

  - [ ] 23.3 Verify package command produces .zip
    - Run `pnpm run package` and verify it produces `almedalsstjarnan.zip` suitable for Chrome Web Store upload
    - _Requirements: 17.2_

- [ ] 24. Checkpoint — Verify full build, all tests, and CI config
  - Ensure `pnpm run build` succeeds, `pnpm run test:unit` passes, `pnpm run test:property` passes, `pnpm run lint` passes, `pnpm run typecheck` passes. Verify bundle sizes.
  - ⚠️ HUMAN REVIEW REQUIRED: Load the built extension as unpacked in Chrome and perform a full manual test on the live almedalsveckan.info site: (1) navigate to a programme listing page, (2) verify star buttons appear on all event cards, (3) star 3+ events, (4) open popup and verify starred events appear, (5) change sort order in popup, (6) open stars page from popup, (7) verify all starred events in 6-column grid, (8) change sort order on stars page, (9) unstar one event from stars page and verify it disappears, (10) click export and verify .ics file downloads with correct filename, (11) open the .ics file in a calendar app and verify events are correct. Do not proceed to task 25 until the user confirms the extension works end-to-end on the live site.
  - 🔄 START A NEW CHAT SESSION after this checkpoint before proceeding to task 25. This keeps context fresh for the final batch of tasks.
  - 🔄 START A NEW CHAT SESSION after this checkpoint before proceeding to task 25. This keeps context fresh for the final batch of tasks.

- [ ] 25. E2E tests
  - [ ] 25.1 Write E2E test: star/unstar flow
    - Create `tests/e2e/star-unstar.e2e.test.ts` using Playwright: load extension with fixture page, click star button on an event card, verify button switches to filled state, click again to unstar, verify button switches to outlined state, open popup, verify event appears in list when starred, verify event disappears when unstarred
    - _Requirements: 18.4_

  - [ ] 25.2 Write E2E test: ICS export
    - Create `tests/e2e/ics-export.e2e.test.ts` using Playwright: star multiple events, open stars page, click export button, verify .ics file downloaded with filename matching `almedalsstjarnan-starred-events-YYYYMMDD-HHMMSS.ics`, verify file contains valid ICS content with correct PRODID and VEVENT entries
    - _Requirements: 18.4_

- [ ] 26. Final checkpoint — Full verification
  - Run complete test suite: `pnpm run test:unit`, `pnpm run test:property`, `pnpm run test:e2e`. Run `pnpm run lint`, `pnpm run typecheck`, `pnpm run build`. Verify all pass. Ensure all requirements are covered.
  - ⚠️ HUMAN REVIEW REQUIRED — FINAL SIGN-OFF: Load the built extension in Chrome and perform a complete acceptance test against the live almedalsveckan.info site covering all 18 acceptance criteria from the specification. Verify: star injection on listing and detail pages, star/unstar toggle, persistence across browser restart, popup count and list, stars page with all 4 sort orders, unstar from stars page, ICS export with correct content and timezone, no network requests during star/unstar/sort/export, keyboard accessibility for all controls. This is the final gate before the extension is considered production-ready. Do not package for Chrome Web Store upload until the user signs off.

## Notes

- All test tasks are mandatory — none are optional. TDD is enforced: tests come before implementation.
- Every property test references a specific correctness property from the design document and the requirements it validates.
- Path aliases use `#` prefix (`#core/*`, `#ui/*`, etc.) — not `@` prefix.
- Tailwind CSS is used only for Popup UI and Stars Page. Shadow DOM star buttons use plain scoped CSS.
- `vite-plugin-web-extension` is used for bundling — not `@crxjs/vite-plugin`.
- PRODID is `-//Almedalsstjärnan//EN`. Export filename pattern is `almedalsstjarnan-starred-events-YYYYMMDD-HHMMSS.ics`.
- Sort orders: chronological, reverse-chronological, alphabetical-by-title, starred-desc.
- The i18n catalog at `.kiro/specs/almedals-planner-extension/i18n-catalog.md` contains the complete message key definitions for both locales.
- Checkpoints ensure incremental validation at each major phase boundary.
- All browser API access goes through `IBrowserApiAdapter` — no direct `chrome.*` calls outside `browser-api-adapter.ts`.
- **Git workflow**: Commit and push after completing each top-level task. Do not batch multiple top-level tasks into one commit. This is enforced via the commit-messages steering file.
- **Human review checkpoints** (marked with ⚠️) are non-skippable gates where automated tests are insufficient. These require the user to visually inspect rendered UI, verify DOM fixtures against the live site, or perform manual acceptance testing. The agent must stop and wait for explicit user confirmation before proceeding past these checkpoints. There are 5 human review points: after task 3.5 (DOM fixture), checkpoint 16 (star button visual), checkpoint 20 (popup + stars page visual), checkpoint 24 (live-site integration), and checkpoint 26 (final acceptance).
