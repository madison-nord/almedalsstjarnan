# Tasks

## Requirement 5: Configurable Date Mapping

- [x] 1. Extract date configuration to `src/core/date-config.ts`
  - [x] 1.1 Create `src/core/date-config.ts` exporting `DAY_TO_DATE`, `SWEDISH_DAYS`, and `STOCKHOLM_SUMMER_OFFSET` with update cadence comment
  - [x] 1.2 Update `src/core/event-normalizer.ts` to import constants from `date-config.ts` instead of defining inline
  - [x] 1.3 Update `src/core/index.ts` barrel exports to include date-config exports
  - [x] 1.4 Write unit test `tests/unit/core/date-config.test.ts` verifying exports and structure
  - [x] 1.5 Run existing normalizer tests to confirm no regressions

## Requirement 4: Date and Time Formatting

- [x] 2. Implement Date Formatter module
  - [x] 2.1 Create `src/core/date-formatter.ts` with `formatEventDateTime(startDateTime, endDateTime, locale)` pure function
  - [x] 2.2 Write unit tests `tests/unit/core/date-formatter.test.ts` for Swedish format, English format, null endDateTime, same-day range, cross-day edge case
  - [x] 2.3 Write property test `tests/property/date-format-roundtrip.property.test.ts` (Property 3: round-trip consistency)
  - [x] 2.4 Write property test `tests/property/date-format-range.property.test.ts` (Property 4: range formatting correctness)
  - [x] 2.5 Update `src/core/index.ts` barrel exports

- [x] 3. Integrate Date Formatter into UI
  - [x] 3.1 Update `src/ui/popup/components/EventItem.tsx` to use `formatEventDateTime` instead of raw ISO strings
  - [x] 3.2 Update `src/ui/stars/components/EventRow.tsx` to use `formatEventDateTime` instead of raw ISO strings
  - [x] 3.3 Update existing UI tests to account for formatted date output

## Requirement 8: Conflict Detection

- [x] 4. Implement Conflict Detector module
  - [x] 4.1 Create `src/core/conflict-detector.ts` with `detectConflicts()` and `getConflictingEventIds()` pure functions
  - [x] 4.2 Write unit tests `tests/unit/core/conflict-detector.test.ts` for no conflicts, two-way overlap, three-way overlap, zero-duration events, empty array
  - [x] 4.3 Write property test `tests/property/conflict-detection.property.test.ts` (Property 7: conflict detection correctness)
  - [x] 4.4 Update `src/core/index.ts` barrel exports

- [x] 5. 🔒 HUMAN REVIEW: Conflict visualization approach
  - [x] 5.1 Present 2–3 conflict visualization options (e.g., colored grouping, connecting lines, timeline sidebar) with pros/cons
  - [x] 5.2 Wait for explicit approval before proceeding with implementation

- [x] 6. Integrate conflict indicators into UI (after approval)
  - [x] 6.1 Add conflict detection to `src/ui/popup/hooks/useStarredEvents.ts` — compute conflicting IDs when events change
  - [x] 6.2 Add conflict detection to `src/ui/stars/hooks/useStarredEvents.ts` — compute conflicting IDs when events change
  - [x] 6.3 Update `src/ui/popup/components/EventItem.tsx` to display conflict indicator for conflicting events
  - [x] 6.4 Update `src/ui/stars/components/EventRow.tsx` to display conflict indicator for conflicting events
  - [x] 6.5 Add i18n keys for conflict-related labels (`conflictWarning`, `conflictTooltip`) to both locale files
  - [x] 6.6 Write unit tests for conflict indicator rendering in popup and stars page

## Requirement 7: Reliability and Feedback

- [x] 7. Implement Badge updates in background service worker
  - [x] 7.1 Add `chrome.storage.onChanged` listener in `src/extension/background.ts` to update badge text via `chrome.action.setBadgeText`
  - [x] 7.2 Write property test `tests/property/badge-count.property.test.ts` (Property 6: badge count matches starred event count)
  - [x] 7.3 Write unit test for badge cleared on zero events

- [x] 8. Implement Undo Toast component
  - [x] 8.1 Create `src/ui/shared/UndoToast.tsx` with timer-based undo pattern (5-second default)
  - [x] 8.2 Add i18n keys for undo toast (`undoAction`, `eventRemoved`) to both locale files
  - [x] 8.3 Write unit tests `tests/unit/ui/shared/UndoToast.test.tsx` for appearance, undo click, timer expiry
  - [x] 8.4 Write property test `tests/property/undo-roundtrip.property.test.ts` (Property 5: undo restores original event data)

- [x] 9. Integrate undo flow into popup and stars page
  - [x] 9.1 Update `src/ui/popup/hooks/useStarredEvents.ts` to defer UNSTAR_EVENT and support undo
  - [x] 9.2 Update `src/ui/stars/hooks/useStarredEvents.ts` to defer UNSTAR_EVENT and support undo
  - [x] 9.3 Render UndoToast in popup App and stars App when events are unstarred
  - [x] 9.4 Update existing unstar tests to account for delayed deletion

- [x] 10. Implement Star Button error resilience
  - [x] 10.1 Update `src/extension/content-script.ts` onStar/onUnstar callbacks to catch errors and revert visual state
  - [x] 10.2 Add error flash CSS animation to `src/extension/star-button.ts` scoped styles
  - [x] 10.3 Write property test `tests/property/star-button-revert.property.test.ts` (Property 8: star button reverts on message failure)
  - [x] 10.4 Write unit test for error flash behavior

## Requirement 1: Popup Interaction Enhancements

- [x] 11. Add export button to popup
  - [x] 11.1 Add export logic to `src/ui/popup/hooks/useStarredEvents.ts` (reuse `generateICS` + blob download pattern)
  - [x] 11.2 Create `src/ui/popup/components/ExportButton.tsx` or add export button to popup App footer
  - [x] 11.3 Write unit test for popup export button

- [x] 12. Add star toggle and source links to popup EventItem
  - [x] 12.1 Update `src/ui/popup/components/EventItem.tsx` to accept `onUnstar` callback and render filled star toggle
  - [x] 12.2 Update `src/ui/popup/components/EventItem.tsx` to render title as `<a>` link when `sourceUrl` is non-null
  - [x] 12.3 Update `src/ui/popup/components/EventList.tsx` to pass `onUnstar` and `adapter` to EventItem
  - [x] 12.4 Write unit tests for star toggle click and source link rendering

- [x] 13. Add expand/collapse to popup EventItem
  - [x] 13.1 Update `src/ui/popup/components/EventItem.tsx` with expand/collapse toggle and expanded content (description, topic, full time range)
  - [x] 13.2 Write unit tests for expand/collapse behavior

- [x] 14. Add count indicator and pagination to popup
  - [x] 14.1 Add i18n keys for count indicator (`eventCountIndicator`) to both locale files
  - [x] 14.2 Update `src/ui/popup/components/EventList.tsx` to display count indicator and load-more button
  - [x] 14.3 Write property test `tests/property/filter-matching.property.test.ts` (Property 1: filter returns only matching events) — note: this property covers the filter logic used in both popup count and stars page filter
  - [x] 14.4 Write unit tests for count indicator accuracy and load-more behavior

## Requirement 2: Stars Page Usability Improvements

- [x] 15. Add search filter to stars page
  - [x] 15.1 Create `src/ui/stars/components/SearchFilter.tsx` text input component
  - [x] 15.2 Add filter logic to `src/ui/stars/hooks/useStarredEvents.ts` — filter by title, organiser, topic (case-insensitive)
  - [x] 15.3 Add i18n keys for search filter (`filterPlaceholder`, `filterLabel`) to both locale files
  - [x] 15.4 Write unit tests for SearchFilter component and filter logic

- [x] 16. Add date grouping to stars page
  - [x] 16.1 Create `src/ui/stars/components/SectionHeader.tsx` for date group headers
  - [x] 16.2 Update `src/ui/stars/components/EventGrid.tsx` to group events by date and render section headers
  - [x] 16.3 Add i18n keys for date group headers if needed
  - [x] 16.4 Write property test `tests/property/date-grouping.property.test.ts` (Property 2: date grouping and within-group ordering)
  - [x] 16.5 Write unit tests for date grouping rendering

- [x] 17. Add bulk selection and batch actions to stars page
  - [x] 17.1 Create `src/ui/stars/components/BulkActions.tsx` with select-all checkbox and batch unstar/export controls
  - [x] 17.2 Update `src/ui/stars/components/EventRow.tsx` to include a selection checkbox
  - [x] 17.3 Update `src/ui/stars/hooks/useStarredEvents.ts` to manage selection state (`Set<EventId>`)
  - [x] 17.4 Add i18n keys for bulk actions (`selectAll`, `unstarSelected`, `exportSelected`) to both locale files
  - [x] 17.5 Write unit tests for bulk selection, batch unstar, and batch export

- [x] 18. Rename Actions column header
  - [x] 18.1 Update `columnActions` i18n key value or remove header text in `src/ui/stars/components/EventGrid.tsx`
  - [x] 18.2 Update unit tests for EventGrid column headers

## Requirement 6: User Guidance and Language

- [x] 19. Implement Onboarding View
  - [x] 19.1 Create `src/ui/popup/components/OnboardingView.tsx` with dismissible introductory content
  - [x] 19.2 Add i18n keys for onboarding content (`onboardingTitle`, `onboardingStep1`, `onboardingStep2`, `onboardingStep3`, `onboardingStep4`, `onboardingDismiss`, `helpLink`) to both locale files
  - [x] 19.3 Update `src/core/types.ts` StorageSchema to add `onboardingDismissed: boolean`
  - [x] 19.4 Add `GET_ONBOARDING_STATE` and `SET_ONBOARDING_STATE` message commands to background.ts
  - [x] 19.5 Integrate OnboardingView into popup App — show on first run, hide after dismissal
  - [x] 19.6 Add "How it works" help link in popup footer
  - [x] 19.7 Write unit tests for OnboardingView rendering, dismissal, and help link

- [x] 20. Implement Language Toggle
  - [x] 20.1 Create `src/ui/shared/LanguageToggle.tsx` with Svenska/English/Auto options
  - [x] 20.2 Update `src/core/types.ts` StorageSchema to add `languagePreference: 'sv' | 'en' | null`
  - [x] 20.3 Add `GET_LANGUAGE_PREFERENCE` and `SET_LANGUAGE_PREFERENCE` message commands to background.ts
  - [x] 20.4 Implement locale-aware `getMessage` wrapper that respects manual override by bundling both locale files
  - [x] 20.5 Add i18n keys for language toggle (`languageLabel`, `languageAuto`, `languageSv`, `languageEn`) to both locale files
  - [x] 20.6 Integrate LanguageToggle into popup App (settings area or footer)
  - [x] 20.7 Write unit tests for LanguageToggle rendering, persistence, and locale override behavior

## Requirement 3: Visual Design and Branding

- [x] 21. 🔒 HUMAN REVIEW: Color palette and branding direction
  - [x] 21.1 Present 2–3 color palette options with mockups showing popup and stars page
  - [x] 21.2 Present card-style EventItem layout options for popup
  - [x] 21.3 Present branded header concepts for popup
  - [x] 21.4 Wait for explicit approval before proceeding

- [x] 22. 🔒 HUMAN REVIEW: Icon redesign
  - [x] 22.1 Present 2–3 icon design concepts at 16px, 32px, 48px, and 128px
  - [x] 22.2 Wait for explicit approval before proceeding

- [x] 23. Implement approved visual design (after approval)
  - [x] 23.1 Update `tailwind.config.ts` with approved custom color palette
  - [x] 23.2 Update `src/ui/popup/components/EventItem.tsx` with card-style layout
  - [x] 23.3 Update `src/ui/popup/App.tsx` with branded header
  - [x] 23.4 Update `src/ui/stars/components/EventGrid.tsx` with zebra striping and hover states
  - [x] 23.5 Update `src/ui/stars/App.tsx` with responsive layout improvements
  - [x] 23.6 Replace icon files in `icons/` with approved designs
  - [x] 23.7 Add star animation CSS to `src/extension/star-button.ts` scoped styles
  - [x] 23.8 Update existing UI tests to account for new styling classes

## Final Verification

- [x] 24. Run full test suite and verify no regressions
  - [x] 24.1 Run `pnpm test:unit` — all unit tests pass
  - [x] 24.2 Run `pnpm test:property` — all property tests pass (100+ iterations each)
  - [x] 24.3 Run `pnpm typecheck` — no type errors
  - [x] 24.4 Run `pnpm lint` — no lint errors
  - [x] 24.5 Manual smoke test: install extension, star events, verify popup enhancements, verify stars page enhancements
