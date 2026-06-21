# Implementation Plan: Event Data Refresh

## Overview

Implement a silent background refresh mechanism that detects when starred event data has changed on the almedalsveckan.info website and updates `chrome.storage.local` while preserving the user's original `starredAt` timestamp. The implementation follows a TDD workflow: type definitions first, then pure comparison logic with property tests, then background handler updates, and finally content script integration.

## Tasks

- [x] 1. Define type extensions and comparison module interfaces
  - [x] 1.1 Add new types to `src/core/types.ts`
    - Add `'UPDATE_STARRED_EVENT'` to the `MESSAGE_COMMANDS` array and `MessageCommand` union
    - Add `UpdateStarredEventPayload` interface with `command`, `eventId`, and all 9 mutable fields as readonly properties
    - Add `UpdateStarredEventPayload` to the `MessagePayload` union type
    - Add `GetStarStateData` interface: `{ readonly starred: boolean; readonly storedFields: MutableFields | null }`
    - Change `GetStarStateResponse` from `MessageResponse<boolean>` to `MessageResponse<GetStarStateData>`
    - _Requirements: 3.1, 3.2, 4.1, 4.2_

  - [x] 1.2 Create `src/core/event-field-comparator.ts` with exported types and function signatures
    - Export `MUTABLE_FIELDS` constant array of the 9 field names
    - Export `MutableFieldName` type (element type of the array)
    - Export `MutableFields` type as `Pick<NormalizedEvent, MutableFieldName>`
    - Export `ComparisonResult` interface: `{ readonly hasChanges: boolean; readonly changedFields: readonly MutableFieldName[] }`
    - Export `normalizeFieldValue(value: string | null): string | null` stub
    - Export `compareEventFields(fresh: MutableFields, stored: MutableFields): ComparisonResult` stub
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 2. Implement comparison logic with TDD
  - [x] 2.1 Implement `normalizeFieldValue` in `src/core/event-field-comparator.ts`
    - Return `null` for `null` input
    - Trim leading/trailing whitespace from string input
    - Convert empty or whitespace-only strings to `null`
    - Return trimmed string otherwise
    - _Requirements: 5.1_

  - [x] 2.2 Write property test for field normalization
    - **Property 1: Field normalization converts whitespace-only to null and trims**
    - Create `tests/property/field-normalization.property.test.ts`
    - Test: null input → null output
    - Test: whitespace-only strings → null output
    - Test: non-whitespace strings → trimmed output with no leading/trailing whitespace
    - **Validates: Requirements 5.1**

  - [x] 2.3 Implement `compareEventFields` in `src/core/event-field-comparator.ts`
    - Iterate over all 9 `MUTABLE_FIELDS`
    - Normalize both fresh and stored values with `normalizeFieldValue`
    - Use strict equality (`===`) to compare normalized values (two nulls are equal)
    - Collect field names that differ into `changedFields`
    - Return `{ hasChanges: changedFields.length > 0, changedFields }`
    - _Requirements: 5.2, 5.3, 5.4_

  - [x] 2.4 Write property test for comparison idempotence
    - **Property 2: Self-comparison yields no changes (idempotence)**
    - Create `tests/property/comparison-idempotence.property.test.ts`
    - Generate arbitrary `MutableFields` and compare against itself
    - Assert `hasChanges === false` and `changedFields` is empty
    - **Validates: Requirements 5.4, 5.5**

  - [x] 2.5 Write property test for comparison sensitivity
    - **Property 3: Comparison detects real differences (sensitivity)**
    - Create `tests/property/comparison-sensitivity.property.test.ts`
    - Generate two `MutableFields` objects that differ in at least one field after normalization
    - Assert `hasChanges === true` and `changedFields` contains at least one differing field
    - **Validates: Requirements 5.3, 5.6**

  - [x] 2.6 Write unit tests for `event-field-comparator.ts`
    - Create `tests/unit/core/event-field-comparator.test.ts`
    - Test edge cases: all-null fields, mixed null/non-null, trailing whitespace, empty strings
    - Test that `normalizeFieldValue` handles `"  "`, `""`, `null`, `" hello "` correctly
    - Test `compareEventFields` with identical objects, single-field differences, all-fields different
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 3. Checkpoint - Ensure comparison logic tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Implement enhanced GET_STAR_STATE handler
  - [x] 4.1 Update `isEventStarred` in `src/extension/background.ts` to return `GetStarStateData`
    - Read the full `StarredEvent` from storage when starred
    - Extract the 9 mutable fields into a `MutableFields` object as `storedFields`
    - Return `{ starred: true, storedFields }` when event exists
    - Return `{ starred: false, storedFields: null }` when event does not exist
    - Import `MutableFields`, `MUTABLE_FIELDS`, and `GetStarStateData` from `#core/event-field-comparator`
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 4.2 Write property test for GET_STAR_STATE stored fields
    - **Property 5: GET_STAR_STATE returns stored mutable fields for starred events**
    - Create `tests/property/get-star-state-fields.property.test.ts`
    - Star an event via `handleMessage`, then send `GET_STAR_STATE`
    - Assert response has `starred: true` and `storedFields` matches each of the 9 mutable fields
    - Use in-memory adapter pattern from existing property tests
    - **Validates: Requirements 4.1**

  - [x] 4.3 Write unit tests for enhanced GET_STAR_STATE
    - Add tests in `tests/unit/background/get-star-state.test.ts`
    - Test: starred event returns `{ starred: true, storedFields: {...} }` with correct field values
    - Test: non-starred event returns `{ starred: false, storedFields: null }`
    - _Requirements: 4.1, 4.2_

- [ ] 5. Implement UPDATE_STARRED_EVENT handler
  - [x] 5.1 Add `updateStarredEvent` handler in `src/extension/background.ts`
    - Import `UpdateStarredEventPayload` type
    - Wrap logic in `withStorageMutex` for serialized access
    - Read `starredEvents` from storage
    - If event not found, return `{ success: true, data: undefined }` (no-op)
    - If found, merge: preserve `id`, `starred`, `starredAt`; overwrite 9 mutable fields from payload
    - Write updated `starredEvents` back to storage
    - Return `{ success: true, data: undefined }`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.3, 3.4, 3.5_

  - [x] 5.2 Add `'UPDATE_STARRED_EVENT'` case to the switch in `handleMessage`
    - Wire to the new `updateStarredEvent(adapter, message)` handler
    - Ensure error handling follows existing pattern (caught by outer try/catch)
    - _Requirements: 3.1_

  - [x] 5.3 Write property test for update preserving immutable fields
    - **Property 4: Update preserves immutable fields**
    - Create `tests/property/update-preserves-immutable.property.test.ts`
    - Star an event, then send `UPDATE_STARRED_EVENT` with random mutable field values
    - Assert `id`, `starred`, and `starredAt` are unchanged in storage
    - Use in-memory adapter pattern
    - **Validates: Requirements 2.1, 2.2, 2.3**

  - [x] 5.4 Write property test for no update on non-starred events
    - **Property 6: No update message for non-starred events**
    - Create `tests/property/no-update-non-starred.property.test.ts`
    - Send `UPDATE_STARRED_EVENT` for an event id not in storage
    - Assert response is `{ success: true, data: undefined }`
    - Assert storage is unchanged (no new keys)
    - **Validates: Requirements 6.4**

  - [x] 5.5 Write property test for concurrent mutex writes
    - **Property 7: Concurrent updates via mutex preserve all writes**
    - Create `tests/property/mutex-concurrent-writes.property.test.ts`
    - Star multiple events, then fire concurrent `UPDATE_STARRED_EVENT` messages for different event ids
    - Assert each event's final stored state reflects its most recent update
    - Assert no writes are lost
    - **Validates: Requirements 3.3**

  - [x] 5.6 Write unit tests for UPDATE_STARRED_EVENT handler
    - Create `tests/unit/background/update-starred-event.test.ts`
    - Test: successful update overwrites mutable fields
    - Test: non-existent event returns success with no storage modification
    - Test: storage error returns `MessageResponseError`
    - Test: response shape is `{ success: true, data: undefined }`
    - _Requirements: 2.1, 2.4, 2.5, 3.4, 3.5_

- [x] 6. Checkpoint - Ensure background handler tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Update content script and consumers for new GET_STAR_STATE response shape
  - [x] 7.1 Update `processEventCard` in `src/extension/content-script.ts` for new response shape
    - Change `adapter.sendMessage<boolean>` to `adapter.sendMessage<GetStarStateData>` for GET_STAR_STATE
    - Read `starred` from `response.data.starred` instead of directly from `response.data`
    - Store `storedFields` from `response.data.storedFields` for use in refresh logic
    - Update fallback: if response fails, use `{ starred: false, storedFields: null }` as default
    - _Requirements: 4.3, 4.4_

  - [x] 7.2 Update `star-button.ts` and any UI consumers that call GET_STAR_STATE
    - Update any direct consumers of GET_STAR_STATE to read `.starred` from the new `GetStarStateData` shape
    - Ensure initial star state is correctly extracted from the new response format
    - _Requirements: 4.1, 4.2_

  - [x] 7.3 Add `refreshStarredEventData` helper to `src/extension/content-script.ts`
    - Import `compareEventFields` from `#core/event-field-comparator`
    - Import `MutableFields` type from `#core/event-field-comparator`
    - Implement async helper: accepts `freshEvent`, `storedFields`, `eventId`, `adapter`
    - Call `compareEventFields(freshEvent, storedFields)` to detect changes
    - If no changes, return early
    - If changes detected, send `UPDATE_STARRED_EVENT` message with eventId and all 9 fresh mutable field values
    - Wrap in try/catch — log warning on failure, never throw
    - _Requirements: 1.3, 1.4, 1.5, 6.2_

  - [x] 7.4 Integrate refresh call into `processEventCard` flow
    - After star button injection and `data-almedals-planner-initialized` marking
    - Fire-and-forget: `void refreshStarredEventData(event, storedFields, eventId, adapter)`
    - Only call when `starred === true` and `storedFields !== null`
    - Ensure refresh runs after star button is visually ready (non-interference)
    - _Requirements: 1.1, 1.4, 6.1, 6.3, 6.4_

  - [x] 7.5 Write unit tests for content script refresh integration
    - Create or extend `tests/unit/content/content-script-refresh.test.ts`
    - Test: refresh is called only for starred events
    - Test: refresh skipped when `storedFields` is null
    - Test: `UPDATE_STARRED_EVENT` sent when fields differ
    - Test: no message sent when fields match
    - Test: failure logged and star button state unchanged on error
    - Test: normalization failure logs warning and skips refresh
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 6.2, 6.4_

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks are mandatory
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The design uses TypeScript throughout — all code examples use TypeScript
- The `GET_STAR_STATE` response change is a breaking internal protocol change; all consumers must be updated atomically (task 7.1 and 7.2)
- The comparison module (`event-field-comparator.ts`) is pure and side-effect-free, enabling isolated testing
- All background handler tests use the in-memory adapter pattern established in existing property tests
- Custom arbitraries for `MutableFields` should be added to `tests/helpers/event-generators.ts`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3"] },
    { "id": 3, "tasks": ["2.4", "2.5", "2.6"] },
    { "id": 4, "tasks": ["4.1", "5.1"] },
    { "id": 5, "tasks": ["4.2", "4.3", "5.2"] },
    { "id": 6, "tasks": ["5.3", "5.4", "5.5", "5.6"] },
    { "id": 7, "tasks": ["7.1", "7.2"] },
    { "id": 8, "tasks": ["7.3"] },
    { "id": 9, "tasks": ["7.4"] },
    { "id": 10, "tasks": ["7.5"] }
  ]
}
```
