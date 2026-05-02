# Requirements Document

## Introduction

Almedalsstjärnan is a Chrome-first, WebExtensions-compatible desktop browser extension that enables users to star events on the official Almedalsveckan programme website (almedalsveckan.info), view starred events in a dedicated page, sort them by multiple criteria, and export the full starred schedule as an ICS calendar file. The extension injects star controls directly into programme listing pages, persists selections in browser local storage, and provides both a popup summary and a full starred-events page. All user-facing text is localized in Swedish (default) and English. The extension is built with Manifest V3, TypeScript, React, Vite, pnpm, Tailwind CSS (popup and stars page only), Shadow DOM isolation for injected controls, and follows strict TDD practices with Vitest, fast-check, and Playwright.

## Glossary

- **Extension**: The Almedalsstjärnan browser extension, the system under development.
- **Content_Script**: The module injected into almedalsveckan.info programme pages that observes DOM changes and injects star controls.
- **Background_Service_Worker**: The Manifest V3 background script that manages storage operations and responds to messages from other extension modules.
- **Popup_UI**: The browser action popup (360px wide, 480px min height) showing a summary of starred events with sort controls and a link to the full list.
- **Stars_Page**: The dedicated extension page (stars.html) displaying all starred events in a 6-column grid layout with sort controls and ICS export.
- **Star_Button**: The interactive control injected by Content_Script into each event card, consisting of a 16px inline SVG icon within a 32px clickable area, rendered inside a Shadow DOM.
- **Shadow_DOM**: The encapsulated DOM subtree used to isolate each injected Star_Button from the host page styles.
- **MutationObserver**: The browser API used by Content_Script to detect dynamically added event cards in the host page DOM.
- **ICS_Generator**: The shared core submodule that produces RFC 5545-compliant ICS calendar files from starred event data.
- **ICS_Parser**: The shared core submodule that parses ICS calendar data for round-trip validation.
- **Event_Normalizer**: The shared core submodule that extracts and normalizes event data from DOM elements into a canonical internal format.
- **Sorter**: The shared core submodule that sorts event collections by one of four defined sort orders.
- **Browser_API_Adapter**: The shared core submodule that wraps browser extension APIs (storage, i18n, messaging, downloads, tabs) behind a testable interface.
- **Starred_Event**: An event that the user has marked with a star, persisted in storage.local under the starredEvents key.
- **Sort_Order**: One of four orderings: chronological (default), reverse-chronological, alphabetical-by-title, starred-desc.
- **Message_Command**: One of six defined commands exchanged between extension modules: STAR_EVENT, UNSTAR_EVENT, GET_STAR_STATE, GET_ALL_STARRED_EVENTS, GET_SORT_ORDER, SET_SORT_ORDER.
- **Host_Page**: Any page on almedalsveckan.info matching the programme URL pattern where Content_Script is active.
- **Event_Card**: A DOM element on the Host_Page representing a single scheduled event in the Almedalsveckan programme.
- **Locale**: One of the two supported display languages: Swedish (sv) or English (en).
- **PRODID**: The ICS product identifier string: -//Almedalsstjärnan//EN.
- **Export_Filename**: The ICS export filename pattern: almedalsstjarnan-starred-events-YYYYMMDD-HHMMSS.ics (not localized).

## Requirements

### Requirement 1: Project Initialization and Tooling

**User Story:** As a developer, I want a fully configured project scaffold with all tooling, linting, formatting, path aliases, and build pipeline ready, so that I can begin TDD development immediately without setup friction.

#### Acceptance Criteria

1. THE Extension project SHALL use pnpm as the sole package manager with a pnpm-lock.yaml lockfile.
2. THE Extension project SHALL require Node.js version 20 or higher, enforced via an engines field in package.json.
3. THE Extension project SHALL use Vite as the bundler with vite-plugin-web-extension for hot reload during development.
4. THE Extension project SHALL use TypeScript in strict mode with noUncheckedIndexedAccess and noImplicitOverride enabled in tsconfig.json.
5. THE Extension project SHALL define path aliases #core/*, #ui/*, #features/*, #extension/*, and #test/* in both tsconfig.json and vite.config.ts.
6. THE Extension project SHALL use ESLint and Prettier configured from the first commit, with consistent rules enforced across all source and test files.
7. THE Extension project SHALL use Vitest as the unit test runner, fast-check for property-based tests, and Playwright for minimal E2E tests.
8. THE Extension project SHALL use Tailwind CSS for Popup_UI and Stars_Page styling only.
9. THE Extension project SHALL use plain scoped CSS inside Shadow_DOM for injected Star_Button styling only.
10. THE Extension project SHALL include a .gitignore covering node_modules, dist, coverage, .vite, pnpm-store, and build artifacts.
11. THE Extension project SHALL include a README.md documenting project purpose, setup instructions, available scripts, architecture overview, and contribution guidelines.
12. THE Extension project SHALL use GitHub Actions for CI, running lint, type-check, unit tests, and property-based tests on every push and pull request.
13. THE Extension project SHALL use manual semver versioning starting at 0.1.0 during development.
14. THE Extension project SHALL produce a single-package repository structure (no monorepo workspaces).

---

### Requirement 2: Manifest V3 Configuration

**User Story:** As a developer, I want a correct Manifest V3 configuration that declares all required permissions, content scripts, background service worker, popup, and extension pages, so that the extension loads and operates correctly in Chrome.

#### Acceptance Criteria

1. THE Extension SHALL use manifest_version 3.
2. THE Extension manifest SHALL declare the permissions: storage, downloads, tabs.
3. THE Extension manifest SHALL declare a host_permissions entry for *://almedalsveckan.info/*.
4. THE Extension manifest SHALL declare default_locale as "sv".
5. THE Extension manifest SHALL NOT declare any of the following permissions: cookies, history, bookmarks, webRequest, nativeMessaging, identity, sidePanel.
6. THE Extension manifest SHALL register a background service_worker script.
7. THE Extension manifest SHALL register a content_scripts entry matching *://almedalsveckan.info/* with the Content_Script bundle.
8. THE Extension manifest SHALL declare a browser_action (action) with a default_popup pointing to the Popup_UI HTML file.
9. THE Extension manifest SHALL use a simple deep-merge strategy at build time combining one base manifest JSON with per-browser override JSON files.
10. THE Extension manifest SHALL reference localized name and description via __MSG_extensionName__ and __MSG_extensionDescription__ message keys.

---

### Requirement 3: Internationalization

**User Story:** As a user, I want the extension UI displayed in my language (Swedish or English), so that I can understand all controls and messages without language barriers.

#### Acceptance Criteria

1. THE Extension SHALL provide locale files at _locales/sv/messages.json and _locales/en/messages.json.
2. WHEN the browser UI language is Swedish, THE Extension SHALL display all extension-created user-facing text in Swedish.
3. WHEN the browser UI language is English, THE Extension SHALL display all extension-created user-facing text in English.
4. WHEN the browser UI language is neither Swedish nor English, THE Extension SHALL display all extension-created user-facing text in Swedish.
5. THE Extension SHALL use chrome.i18n.getMessage (accessed through Browser_API_Adapter) for all user-facing string retrieval.
6. THE Extension SHALL NOT contain any hardcoded user-facing strings in React components, Content_Script, or generated manifests.
7. THE Extension SHALL localize: manifest name, manifest description, Popup_UI labels, Stars_Page labels, Star_Button accessible labels, sort order labels, empty state messages, export button label, error messages, and success messages.
8. THE Extension SHALL NOT localize official event content (titles, descriptions, locations, organiser names, topic names, source URLs).
9. THE Extension SHALL NOT localize the Export_Filename pattern (almedalsstjarnan-starred-events-YYYYMMDD-HHMMSS.ics).
10. THE Extension SHALL localize the source label in ICS DESCRIPTION: "Källa: {source_url}" for Swedish, "Source: {source_url}" for English.

---

### Requirement 4: Content Script Injection and DOM Observation

**User Story:** As a user browsing the Almedalsveckan programme, I want star buttons to appear on every event card automatically, including cards loaded dynamically, so that I can star any event without page reloads.

#### Acceptance Criteria

1. WHEN the Content_Script is injected into a Host_Page, THE Content_Script SHALL scan the existing DOM for all Event_Card elements and inject a Star_Button into each one.
2. WHEN the Content_Script is injected into a Host_Page, THE Content_Script SHALL create exactly one MutationObserver instance observing the document for added nodes.
3. WHEN the MutationObserver detects a new Event_Card added to the DOM, THE Content_Script SHALL inject a Star_Button into that Event_Card.
4. THE Content_Script SHALL mark each processed Event_Card with the attribute data-almedals-planner-initialized="1" after injecting the Star_Button.
5. THE Content_Script SHALL NOT inject a Star_Button into an Event_Card that already has the attribute data-almedals-planner-initialized="1".
6. THE Content_Script SHALL render each Star_Button inside a Shadow_DOM attached to a container element within the Event_Card.
7. THE Content_Script SHALL use plain scoped CSS within the Shadow_DOM for Star_Button styling, isolated from Host_Page styles.
8. IF the Content_Script encounters an Event_Card from which it cannot extract a valid event identifier, THEN THE Content_Script SHALL skip that Event_Card without injecting a Star_Button and without throwing an error.

---

### Requirement 5: Star Button Appearance and Interaction

**User Story:** As a user, I want a clearly visible, accessible star button on each event card that toggles between starred and unstarred states, so that I can quickly mark events of interest.

#### Acceptance Criteria

1. THE Star_Button SHALL display a 16px inline SVG star icon (custom, no icon library) within a 32px minimum clickable area.
2. WHEN an event is not starred, THE Star_Button SHALL display an outlined (unfilled) star icon.
3. WHEN an event is starred, THE Star_Button SHALL display a filled star icon.
4. THE Star_Button SHALL have an accessible name of the localized equivalent of "Star event" when the event is unstarred.
5. THE Star_Button SHALL have an accessible name of the localized equivalent of "Unstar event" when the event is starred.
6. WHEN the user clicks a Star_Button for an unstarred event, THE Content_Script SHALL send a STAR_EVENT message to the Background_Service_Worker with the event data.
7. WHEN the user clicks a Star_Button for a starred event, THE Content_Script SHALL send an UNSTAR_EVENT message to the Background_Service_Worker with the event identifier.
8. WHEN the Content_Script receives a successful response to a STAR_EVENT message, THE Star_Button SHALL update to the filled (starred) visual state.
9. WHEN the Content_Script receives a successful response to an UNSTAR_EVENT message, THE Star_Button SHALL update to the outlined (unstarred) visual state.
10. WHEN the Content_Script injects a Star_Button, THE Content_Script SHALL send a GET_STAR_STATE message to determine the initial visual state of that Star_Button.

---

### Requirement 6: Event Data Extraction and Normalization

**User Story:** As a developer, I want a reliable module that extracts event data from DOM elements and normalizes it into a canonical format, so that all downstream modules work with consistent, validated event objects.

#### Acceptance Criteria

1. THE Event_Normalizer SHALL extract the following fields from each Event_Card: event identifier, title, organiser name, start date-time, end date-time, location, description, topic, and source URL.
2. THE Event_Normalizer SHALL produce a normalized event object with all fields typed and validated.
3. IF the Event_Normalizer encounters an Event_Card missing a required field (event identifier, title, or start date-time), THEN THE Event_Normalizer SHALL return an error result indicating the missing field.
4. WHEN the Event_Normalizer encounters optional fields (location, description, topic, organiser, end date-time, source URL) that are absent, THE Event_Normalizer SHALL set those fields to defined empty or null values in the normalized object.
5. THE Event_Normalizer SHALL trim whitespace from all extracted string fields.
6. THE Event_Normalizer SHALL parse date-time strings from the Host_Page into ISO 8601 format with timezone information.

---

### Requirement 7: Background Service Worker and Storage

**User Story:** As a user, I want my starred events and sort preference to persist across browser sessions, so that I never lose my selections.

#### Acceptance Criteria

1. THE Background_Service_Worker SHALL listen for incoming Message_Command messages from Content_Script, Popup_UI, and Stars_Page.
2. WHEN the Background_Service_Worker receives a STAR_EVENT command, THE Background_Service_Worker SHALL add the event data to the starredEvents key in storage.local and respond with a success status.
3. WHEN the Background_Service_Worker receives an UNSTAR_EVENT command, THE Background_Service_Worker SHALL remove the event identified by the provided event identifier from the starredEvents key in storage.local and respond with a success status.
4. WHEN the Background_Service_Worker receives a GET_STAR_STATE command, THE Background_Service_Worker SHALL respond with a boolean indicating whether the specified event identifier exists in the starredEvents storage.
5. WHEN the Background_Service_Worker receives a GET_ALL_STARRED_EVENTS command, THE Background_Service_Worker SHALL respond with the complete array of starred event objects from storage.local.
6. WHEN the Background_Service_Worker receives a GET_SORT_ORDER command, THE Background_Service_Worker SHALL respond with the current Sort_Order value from the sortOrder key in storage.local.
7. WHEN the Background_Service_Worker receives a SET_SORT_ORDER command, THE Background_Service_Worker SHALL persist the provided Sort_Order value to the sortOrder key in storage.local and respond with a success status.
8. IF the sortOrder key does not exist in storage.local, THEN THE Background_Service_Worker SHALL return "chronological" as the default Sort_Order.
9. IF the starredEvents key does not exist in storage.local, THEN THE Background_Service_Worker SHALL return an empty array.
10. IF a storage operation fails, THEN THE Background_Service_Worker SHALL respond with an error status and a descriptive error message.

---

### Requirement 8: Message Passing Protocol

**User Story:** As a developer, I want a well-defined message passing protocol between all extension modules, so that communication is type-safe, predictable, and testable.

#### Acceptance Criteria

1. THE Extension SHALL define exactly six Message_Command types: STAR_EVENT, UNSTAR_EVENT, GET_STAR_STATE, GET_ALL_STARRED_EVENTS, GET_SORT_ORDER, SET_SORT_ORDER.
2. THE STAR_EVENT command SHALL carry a payload containing the full normalized event object.
3. THE UNSTAR_EVENT command SHALL carry a payload containing the event identifier string.
4. THE GET_STAR_STATE command SHALL carry a payload containing the event identifier string.
5. THE GET_ALL_STARRED_EVENTS command SHALL carry no payload.
6. THE GET_SORT_ORDER command SHALL carry no payload.
7. THE SET_SORT_ORDER command SHALL carry a payload containing one of the four valid Sort_Order values.
8. THE Background_Service_Worker SHALL respond to every Message_Command with a structured response containing a success boolean and either a data field or an error field.
9. THE Extension SHALL use chrome.runtime.sendMessage (accessed through Browser_API_Adapter) for message passing between Content_Script and Background_Service_Worker.
10. THE Extension SHALL use chrome.runtime.sendMessage (accessed through Browser_API_Adapter) for message passing between Popup_UI/Stars_Page and Background_Service_Worker.

---

### Requirement 9: Popup UI

**User Story:** As a user, I want a quick-access popup showing my most recent starred events with sort controls, so that I can review my selections without leaving the current page.

#### Acceptance Criteria

1. THE Popup_UI SHALL render at 360px width and 480px minimum height.
2. WHEN the Popup_UI opens, THE Popup_UI SHALL send a GET_ALL_STARRED_EVENTS message and a GET_SORT_ORDER message to the Background_Service_Worker.
3. THE Popup_UI SHALL display a maximum of 20 starred events.
4. THE Popup_UI SHALL display each event with its title, organiser, date-time, and location.
5. THE Popup_UI SHALL provide a sort order selector with four options: chronological, reverse-chronological, alphabetical-by-title, starred-desc.
6. WHEN the user changes the sort order in Popup_UI, THE Popup_UI SHALL send a SET_SORT_ORDER message to the Background_Service_Worker and re-sort the displayed list.
7. THE Popup_UI SHALL display an "Open full list" button that opens the Stars_Page.
8. WHEN the user clicks the "Open full list" button, THE Popup_UI SHALL open the Stars_Page in a new tab using chrome.tabs.create (accessed through Browser_API_Adapter).
9. WHEN there are no starred events, THE Popup_UI SHALL display a localized empty state message.
10. THE Popup_UI SHALL use Tailwind CSS for styling.
11. THE Popup_UI SHALL use React for rendering.

---

### Requirement 10: Starred Events Page

**User Story:** As a user, I want a full-page view of all my starred events with sorting and export capabilities, so that I can manage my complete Almedalsveckan schedule.

#### Acceptance Criteria

1. THE Stars_Page SHALL be served from stars.html as a dedicated extension page.
2. WHEN the Stars_Page loads, THE Stars_Page SHALL send a GET_ALL_STARRED_EVENTS message and a GET_SORT_ORDER message to the Background_Service_Worker.
3. THE Stars_Page SHALL display all starred events in a 6-column grid layout (one row per event showing: title, organiser, date-time, location, topic, actions).
4. THE Stars_Page SHALL provide a sort order selector with four options: chronological, reverse-chronological, alphabetical-by-title, starred-desc.
5. WHEN the user changes the sort order on Stars_Page, THE Stars_Page SHALL send a SET_SORT_ORDER message to the Background_Service_Worker and re-sort the displayed list.
6. THE Stars_Page SHALL display an export button labeled with the localized equivalent of "Export to calendar".
7. WHEN the user clicks the export button, THE Stars_Page SHALL trigger ICS file generation and download.
8. THE Stars_Page SHALL provide an unstar action for each event in the actions column.
9. WHEN the user clicks the unstar action for an event, THE Stars_Page SHALL send an UNSTAR_EVENT message to the Background_Service_Worker and remove the event from the displayed list.
10. WHEN there are no starred events, THE Stars_Page SHALL display a localized empty state message.
11. THE Stars_Page SHALL use Tailwind CSS for styling.
12. THE Stars_Page SHALL use React for rendering.

---

### Requirement 11: Sorting

**User Story:** As a user, I want to sort my starred events by time, title, or organiser, so that I can find specific events quickly.

#### Acceptance Criteria

1. THE Sorter SHALL support exactly four Sort_Order values: chronological, reverse-chronological, alphabetical-by-title, starred-desc.
2. WHEN Sort_Order is chronological, THE Sorter SHALL order events by start date-time ascending (earliest first).
3. WHEN Sort_Order is reverse-chronological, THE Sorter SHALL order events by start date-time descending (latest first).
4. WHEN Sort_Order is alphabetical-by-title, THE Sorter SHALL order events by title using locale-aware string comparison ascending (A before Z).
5. WHEN Sort_Order is starred-desc, THE Sorter SHALL order events by starred-at timestamp descending (most recently starred first).
6. WHEN two events have identical sort keys, THE Sorter SHALL use start date-time ascending as the secondary tiebreaker, then event identifier ascending as the tertiary tiebreaker.
7. THE Sorter SHALL NOT mutate the input array; it SHALL return a new sorted array.
8. FOR ALL valid event arrays and Sort_Order values, sorting then sorting again with the same Sort_Order SHALL produce an identical array (idempotence property).

---

### Requirement 12: ICS Calendar Export

**User Story:** As a user, I want to export all my starred events as a single ICS file, so that I can import my Almedalsveckan schedule into any calendar application.

#### Acceptance Criteria

1. THE ICS_Generator SHALL produce a valid RFC 5545 VCALENDAR containing one VEVENT per starred event.
2. THE ICS_Generator SHALL use the VCALENDAR header: VERSION:2.0, PRODID:-//Almedalsstjärnan//EN, CALSCALE:GREGORIAN, METHOD:PUBLISH.
3. THE ICS_Generator SHALL generate each VEVENT with fields: UID, DTSTART, DTEND (if end time exists), SUMMARY, LOCATION (if exists), DESCRIPTION (including localized source label and source URL if exists), ORGANIZER (if exists).
4. THE ICS_Generator SHALL format the UID as {event_identifier}@almedalsstjarnan.
5. THE ICS_Generator SHALL use CRLF (\\r\\n) line endings throughout the ICS output.
6. THE ICS_Generator SHALL fold lines longer than 75 octets according to RFC 5545 line folding rules.
7. THE Extension SHALL trigger the ICS file download using chrome.downloads.download (accessed through Browser_API_Adapter) with the filename almedalsstjarnan-starred-events-YYYYMMDD-HHMMSS.ics where the timestamp reflects the moment of export.
8. THE ICS_Parser SHALL parse ICS calendar data back into structured event objects.
9. FOR ALL valid arrays of starred events, generating ICS then parsing the result SHALL produce event objects equivalent to the input (round-trip property).

---

### Requirement 13: Browser API Adapter

**User Story:** As a developer, I want all browser extension API calls wrapped behind a testable adapter interface, so that I can unit test all modules without depending on real browser APIs.

#### Acceptance Criteria

1. THE Browser_API_Adapter SHALL provide methods wrapping: chrome.storage.local.get, chrome.storage.local.set, chrome.runtime.sendMessage, chrome.i18n.getMessage, chrome.downloads.download, chrome.tabs.create.
2. THE Browser_API_Adapter SHALL expose a consistent Promise-based interface for all wrapped methods.
3. THE Browser_API_Adapter SHALL be the sole module that directly references chrome.* or browser.* global APIs.
4. THE Browser_API_Adapter SHALL be injectable/mockable in all consuming modules for unit testing.
5. IF a browser API call fails, THEN THE Browser_API_Adapter SHALL reject the Promise with a descriptive error including the API method name and the original error message.

---

### Requirement 14: Accessibility

**User Story:** As a user with assistive technology, I want all extension controls to be keyboard-accessible and properly labeled, so that I can use the extension without a mouse.

#### Acceptance Criteria

1. THE Star_Button SHALL be focusable via keyboard Tab navigation.
2. THE Star_Button SHALL activate on Enter and Space key presses.
3. THE Star_Button SHALL have an aria-pressed attribute reflecting the current starred state (true when starred, false when unstarred).
4. THE Star_Button SHALL have an aria-label set to the localized accessible name ("Star event" or "Unstar event").
5. THE Popup_UI SHALL be fully navigable using keyboard Tab, Shift+Tab, Enter, and Space.
6. THE Stars_Page SHALL be fully navigable using keyboard Tab, Shift+Tab, Enter, and Space.
7. THE Extension SHALL meet WCAG 2.1 AA contrast requirements for all text and interactive elements.
8. THE sort order selector in Popup_UI and Stars_Page SHALL be implemented as a native HTML select element or a custom component with appropriate ARIA roles.

---

### Requirement 15: Non-Functional Performance and Size

**User Story:** As a user, I want the extension to be fast and lightweight, so that it does not degrade my browsing experience.

#### Acceptance Criteria

1. THE Content_Script SHALL inject Star_Buttons into visible Event_Cards within 200ms of DOMContentLoaded on a page with up to 100 Event_Cards.
2. THE Popup_UI SHALL render its initial content within 300ms of being opened.
3. THE Stars_Page SHALL render its initial content within 500ms of being opened with up to 500 starred events.
4. THE ICS_Generator SHALL produce an ICS file for 500 events within 1000ms.
5. THE Extension total packaged size SHALL remain below 500KB uncompressed.
6. THE Content_Script bundle size SHALL remain below 50KB (uncompressed, excluding shared core if tree-shaken).

---

### Requirement 16: Security and Permissions

**User Story:** As a user, I want the extension to request only the minimum permissions necessary, so that I can trust it with my browser.

#### Acceptance Criteria

1. THE Extension SHALL request only the permissions: storage, downloads, tabs.
2. THE Extension SHALL request only the host_permissions: *://almedalsveckan.info/*.
3. THE Extension SHALL NOT request any of: cookies, history, bookmarks, webRequest, nativeMessaging, identity, sidePanel.
4. THE Extension SHALL NOT execute any remote code or load scripts from external URLs.
5. THE Extension SHALL NOT transmit any user data to external servers.
6. THE Extension SHALL store all data exclusively in storage.local within the browser profile.

---

### Requirement 17: Build and Deployment

**User Story:** As a developer, I want a reproducible build pipeline that produces a distributable extension package, so that I can publish to the Chrome Web Store.

#### Acceptance Criteria

1. WHEN the build command is executed, THE Extension build pipeline SHALL produce a dist/ directory containing all extension files ready for loading as an unpacked extension.
2. WHEN the package command is executed, THE Extension build pipeline SHALL produce a .zip file suitable for Chrome Web Store upload.
3. THE Extension build pipeline SHALL perform manifest deep-merge (base + browser override) during the build step.
4. THE Extension build pipeline SHALL resolve all path aliases (#core/*, #ui/*, #features/*, #extension/*, #test/*) during bundling.
5. THE Extension build pipeline SHALL tree-shake unused code from the final bundles.
6. THE CI pipeline SHALL run on every push and pull request, executing: lint, type-check, unit tests (Vitest), and property-based tests (fast-check).
7. THE CI pipeline SHALL fail the build if any lint error, type error, or test failure is detected.
8. THE Extension SHALL target Chrome as the sole browser for milestone 1, while maintaining a WebExtensions-compatible codebase.

---

### Requirement 18: Testing Strategy

**User Story:** As a developer, I want a comprehensive, mandatory test suite covering all modules with TDD practices, so that I can refactor and extend the codebase with confidence.

#### Acceptance Criteria

1. THE Extension project SHALL write tests BEFORE implementation code for all modules (TDD).
2. THE Extension project SHALL use Vitest for all unit tests.
3. THE Extension project SHALL use fast-check for property-based tests covering ICS_Parser, ICS_Generator, Sorter, and Event_Normalizer.
4. THE Extension project SHALL use Playwright for minimal E2E tests verifying end-to-end star/unstar flow and ICS export.
5. THE Extension project SHALL maintain a DOM fixture file (fixtures/almedalsveckan-program-2026.html) containing actual saved HTML from almedalsveckan.info for Content_Script tests.
6. FOR ALL valid normalized event objects, THE ICS round-trip property test SHALL verify that generating ICS then parsing produces equivalent event data.
7. FOR ALL valid event arrays and Sort_Order values, THE Sorter idempotence property test SHALL verify that sorting twice produces the same result as sorting once.
8. FOR ALL valid event arrays, THE Sorter length preservation property test SHALL verify that the output array length equals the input array length.
9. THE Extension project SHALL achieve test coverage for all exported functions in shared core modules.
10. THE Extension project SHALL mock Browser_API_Adapter in all unit tests that would otherwise require real browser APIs.

---

### Requirement 19: Developer Experience and Documentation

**User Story:** As a developer, I want clear documentation, consistent project structure, and automated quality checks, so that I can contribute effectively.

#### Acceptance Criteria

1. THE Extension project SHALL include a README.md with: project purpose, prerequisites (Node.js 20+, pnpm), setup instructions, available npm scripts, architecture overview, module descriptions, and contribution guidelines.
2. THE Extension project SHALL include steering files documenting coding conventions, commit message format, and PR review checklist.
3. THE Extension project SHALL include Git hooks (via a hooks setup) that run lint and type-check before commits.
4. THE Extension project SHALL organize source code into the six architecture modules: manifest configuration, content-script, background service worker, popup UI, starred-events page, and shared core (with five submodules).
5. THE Extension project SHALL use a consistent file naming convention across all modules.

---

### Requirement 20: Content Script DOM Model

**User Story:** As a developer, I want the content script to handle the specific DOM structure of almedalsveckan.info correctly, including server-rendered pages with dynamic updates, so that star buttons are reliably injected.

#### Acceptance Criteria

1. THE Content_Script SHALL treat Host_Page content as server-rendered HTML with dynamic DOM updates (not a full SPA with client-side routing).
2. THE Content_Script SHALL create exactly one MutationObserver per document lifetime (no observer per route change, no observer teardown and recreation).
3. THE Content_Script SHALL process both initially-present Event_Cards and dynamically-added Event_Cards using the same injection logic.
4. IF the Host_Page DOM structure changes in a way that prevents Event_Card identification, THEN THE Content_Script SHALL log a warning to the console and continue operating on identifiable Event_Cards without crashing.

---

### Requirement 21: Out-of-Scope Boundaries

**User Story:** As a developer, I want explicit boundaries on what the extension does NOT do, so that scope remains controlled and development stays focused.

#### Acceptance Criteria

1. THE Extension SHALL NOT provide mobile browser support.
2. THE Extension SHALL NOT provide Firefox, Safari, or Edge-specific builds in milestone 1.
3. THE Extension SHALL NOT provide user accounts, cloud sync, or server-side storage.
4. THE Extension SHALL NOT provide social sharing features.
5. THE Extension SHALL NOT provide event notifications or reminders.
6. THE Extension SHALL NOT provide calendar integration beyond ICS file export.
7. THE Extension SHALL NOT provide event search or filtering within the extension UI.
8. THE Extension SHALL NOT modify, hide, or rearrange existing Host_Page content beyond injecting Star_Buttons.
9. THE Extension SHALL NOT provide import of previously exported ICS files back into the extension.
10. THE Extension SHALL NOT provide analytics, telemetry, or usage tracking.
11. THE Extension SHALL NOT provide a settings page or options page.
12. THE Extension SHALL NOT provide custom themes or appearance customization.
13. THE Extension SHALL NOT provide batch operations (star/unstar multiple events at once).
14. THE Extension SHALL NOT provide event notes or user annotations.
15. THE Extension SHALL NOT provide conflict detection between starred events.
16. THE Extension SHALL NOT provide map or venue visualization.
17. THE Extension SHALL NOT provide integration with other event platforms.
18. THE Extension SHALL NOT provide offline mode or service worker caching of Host_Page content.
