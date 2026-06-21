# Implementation Plan: Bulk Star Filtered

## Overview

Implement a "Bulk Star All" feature that adds a floating button to the Almedalsveckan programme page. When activated, the button programmatically expands all pagination, collects visible Event_Cards, normalizes them, and sequentially stars unstarred events via the background worker. The implementation includes a Shadow DOM progress indicator with cancellation, rate limiting, retry logic, and error threshold abort.

## Tasks

- [x] 1. Add locale messages and define constants
  - [x] 1.1 Add bulk-star locale message keys to `_locales/sv/messages.json` and `_locales/en/messages.json`
    - Add keys: `bulkStarAll`, `bulkStarLoading`, `bulkStarEventsFound`, `bulkStarProgress`, `bulkStarCancel`, `bulkStarComplete`, `bulkStarCancelled`, `bulkStarError`
    - Use placeholder syntax `$1`, `$2` where needed
    - _Requirements: 1.3, 4.1, 4.2, 4.3, 4.7, 4.8, 7.3_

  - [x] 1.2 Create `src/extension/bulk-star-constants.ts` with all constants
    - Define `BULK_STAR_CONSTANTS` object with `as const` assertion
    - Include: `MAX_EVENTS_PER_BATCH`, `MAX_PAGINATION_CLICKS`, `PAGINATION_CLICK_TIMEOUT_MS`, `PAGINATION_CLICK_DELAY_MS`, `STAR_MESSAGE_DELAY_MS`, `BATCH_SIZE`, `BATCH_THRESHOLD`, `RETRY_DELAY_MS`, `MAX_RETRIES`, `ERROR_ABORT_THRESHOLD`, `SUMMARY_DISPLAY_MS`, `BUTTON_VIEWPORT_OFFSET_PX`
    - _Requirements: 2.6, 2.7, 3.8, 7.2, 7.3, 8.1, 8.3_

  - [x] 1.3 Create `src/extension/bulk-star-types.ts` with shared interfaces
    - Define `BulkStarProgress`, `BulkStarResult`, `BulkStarOptions` interfaces with readonly properties
    - _Requirements: 3.7, 4.1, 4.7_

- [x] 2. Implement Bulk Star Button (Shadow DOM)
  - [x] 2.1 Create `src/extension/bulk-star-button.ts`
    - Implement `createBulkStarButton(hostElement, options)` factory function
    - Shadow DOM (open mode) with scoped CSS — no Tailwind
    - Fixed-position, top-right corner with 16px offset from viewport edges
    - Rectangular filled button with text label (distinct from circular Star_Buttons)
    - `aria-label` matching visible text, keyboard-focusable, 44×44px minimum touch target
    - Visible focus indicator: 2px solid outline on `:focus-visible`
    - Return handle with `setDisabled`, `setVisible`, `destroy` methods
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 2.2 Write unit tests for bulk-star-button in `tests/unit/extension/bulk-star-button.test.ts`
    - Test Shadow DOM creation and style isolation
    - Test locale label rendering for sv and en
    - Test accessibility attributes (aria-label, touch target, focus indicator)
    - Test setVisible/setDisabled/destroy lifecycle
    - _Requirements: 1.1, 1.3, 1.5_

  - [x] 2.3 Write property test for button visibility
    - **Property 1: Bulk button visibility tracks Event_Card presence**
    - **Validates: Requirements 1.4, 1.6**
    - File: `tests/property/bulk-star-visibility.property.test.ts`

- [x] 3. Implement Progress Indicator (Shadow DOM)
  - [x] 3.1 Create `src/extension/progress-indicator.ts`
    - Implement `createProgressIndicator(hostElement, options)` factory function
    - Shadow DOM (open mode) with scoped CSS
    - Fixed-position floating element
    - Displays phase-dependent text: loading, events found count, progress fraction, summary
    - Cancel button: keyboard-focusable, 44×44px touch target, visible focus indicator
    - `aria-live="polite"` region for screen reader announcements
    - Auto-dismiss after 5 seconds on complete/cancelled, or immediate dismiss on click
    - Return handle with `update`, `dismiss`, `destroy` methods
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.7, 4.8, 4.9_

  - [x] 3.2 Write unit tests for progress-indicator in `tests/unit/extension/progress-indicator.test.ts`
    - Test rendering for each phase (loading, starring, complete, cancelled, error)
    - Test aria-live region attribute
    - Test cancel button accessibility
    - Test auto-dismiss with fake timers
    - Test locale-dependent text (sv/en)
    - _Requirements: 4.1, 4.2, 4.3, 4.7, 4.8, 4.9_

- [x] 4. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement BulkStarCoordinator core logic
  - [x] 5.1 Create `src/extension/bulk-star-coordinator.ts` with `executeBulkStar` function
    - Implement pagination expansion: detect Load_More_Button (`a` with class containing `load-more-button`), click with 300ms delay, 10s timeout per click, max 100 clicks
    - Implement snapshot collection: querySelectorAll `li` elements with `.event-information`, cap at 2000 in DOM order
    - Normalize each card via `normalizeEvent`, skip cards that return `ok: false`
    - Check starred state via `GET_STAR_STATE`, skip already-starred events
    - Send `STAR_EVENT` sequentially with 50ms delay between messages
    - Process in batches of 50 with main-thread yield (setTimeout 0) when > 200 events
    - Report progress via `onProgress` callback after each event
    - Use AbortSignal for cancellation: stop pagination after current click, stop starring immediately
    - Implement retry logic: 1 retry after 1000ms on failure
    - Implement error threshold abort: abort if > 50% failures
    - Never throw — catch all exceptions, log with `[Almedalsstjärnan]` prefix
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 4.5, 4.6, 5.1, 5.2, 5.3, 5.4, 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 8.3_

  - [x] 5.2 Write unit tests for bulk-star-coordinator in `tests/unit/extension/bulk-star-coordinator.test.ts`
    - Test pagination detection and expansion loop
    - Test pagination timeout handling (10s)
    - Test 100-click safety limit
    - Test 300ms delay between pagination clicks
    - Test event collection and normalization filtering
    - Test skip-already-starred logic
    - Test sequential starring with 50ms delay
    - Test retry on failure (1 retry after 1000ms)
    - Test error threshold abort (> 50% failures)
    - Test cancellation during pagination and starring phases
    - Test 2000-event cap
    - Test batching for > 200 events
    - _Requirements: 2.1, 2.4, 2.6, 2.7, 3.1, 3.3, 3.8, 7.2, 7.3, 8.1, 8.3_

- [x] 6. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Write property-based tests for coordinator logic
  - [x] 7.1 Write property test for collection filtering
    - **Property 2: Collection yields only valid normalized events**
    - **Validates: Requirements 3.1, 3.2, 7.1**
    - File: `tests/property/bulk-star-collection-filter.property.test.ts`

  - [x] 7.2 Write property test for skip-starred logic
    - **Property 3: Only unstarred events receive STAR_EVENT messages**
    - **Validates: Requirements 3.3, 3.4**
    - File: `tests/property/bulk-star-skip-starred.property.test.ts`

  - [x] 7.3 Write property test for 2000-event cap
    - **Property 4: Maximum 2000 events processed per batch**
    - **Validates: Requirements 3.8**
    - File: `tests/property/bulk-star-cap.property.test.ts`

  - [x] 7.4 Write property test for snapshot isolation
    - **Property 5: Snapshot isolation — DOM mutations during starring do not affect the processed set**
    - **Validates: Requirements 5.1, 5.2, 5.4**
    - File: `tests/property/bulk-star-snapshot.property.test.ts`

  - [x] 7.5 Write property test for retry logic
    - **Property 6: Retry logic — failed events get exactly one retry**
    - **Validates: Requirements 7.2**
    - File: `tests/property/bulk-star-retry.property.test.ts`

  - [x] 7.6 Write property test for abort threshold
    - **Property 7: Abort threshold — operation aborts when failure rate exceeds 50%**
    - **Validates: Requirements 7.3**
    - File: `tests/property/bulk-star-abort-threshold.property.test.ts`

  - [x] 7.7 Write property test for no-throw guarantee
    - **Property 8: No unhandled exceptions propagate from coordinator**
    - **Validates: Requirements 7.5**
    - File: `tests/property/bulk-star-no-throw.property.test.ts`

  - [x] 7.8 Write property test for rate limiting
    - **Property 9: Sequential rate limiting — minimum 50ms between STAR_EVENT messages**
    - **Validates: Requirements 8.1**
    - File: `tests/property/bulk-star-rate-limit.property.test.ts`

  - [x] 7.9 Write property test for batching
    - **Property 10: Batching with main-thread yields for large sets**
    - **Validates: Requirements 8.3**
    - File: `tests/property/bulk-star-batching.property.test.ts`

  - [x] 7.10 Write property test for cancellation during pagination
    - **Property 11: Cancellation during pagination preserves already-loaded events**
    - **Validates: Requirements 4.5**
    - File: `tests/property/bulk-star-cancel-pagination.property.test.ts`

  - [x] 7.11 Write property test for cancellation during starring
    - **Property 12: Cancellation during starring preserves already-starred events**
    - **Validates: Requirements 4.6**
    - File: `tests/property/bulk-star-cancel-starring.property.test.ts`

  - [x] 7.12 Write property test for summary count accuracy
    - **Property 13: Progress summary counts are accurate**
    - **Validates: Requirements 3.7, 4.7, 4.8**
    - File: `tests/property/bulk-star-summary-counts.property.test.ts`

- [x] 8. Integrate with content script and wire components
  - [x] 8.1 Extend `src/extension/content-script.ts` to inject Bulk Star Button and wire coordinator
    - After initial DOM scan, inject Bulk Star Button host element
    - Show/hide button based on Event_Card count (hidden when zero, shown when ≥ 1)
    - On button click: create AbortController, instantiate progress indicator, call `executeBulkStar`
    - Disable button during operation (re-enable on completion/cancel/error)
    - Wire progress callback to update progress indicator
    - Wire cancel button to abort controller
    - Ensure MutationObserver injects Star_Buttons into new cards loaded during pagination
    - _Requirements: 1.1, 1.4, 1.6, 4.5, 4.6, 6.1, 6.2, 6.3, 6.4, 6.5, 8.4_

  - [x] 8.2 Write integration tests for the full bulk-star flow in `tests/unit/extension/bulk-star-integration.test.ts`
    - Test: inject button → click → expand pagination → star events → verify progress updates
    - Test: star button sync via storage.onChanged during operation
    - Test: button disabled during operation, re-enabled after
    - _Requirements: 6.1, 6.2, 6.3, 8.4_

- [x] 9. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- All UI components use Shadow DOM with scoped CSS (no Tailwind in content script)
- All browser API access goes through `IBrowserApiAdapter`
- The coordinator reuses existing `STAR_EVENT` and `GET_STAR_STATE` message commands — no new background worker changes needed

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.2"] },
    { "id": 3, "tasks": ["5.1"] },
    { "id": 4, "tasks": ["5.2", "7.1", "7.2", "7.3", "7.4", "7.5", "7.6", "7.7", "7.8", "7.9", "7.10", "7.11", "7.12"] },
    { "id": 5, "tasks": ["8.1"] },
    { "id": 6, "tasks": ["8.2"] }
  ]
}
```
