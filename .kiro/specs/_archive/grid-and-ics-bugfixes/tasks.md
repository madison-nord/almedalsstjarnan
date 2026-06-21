# Implementation Tasks

## Bug 1: Grid Layout Overflow Fix

- [x] 1. Add overflow handling to EventGrid and EventRow (TDD)
  - [x] 1.1 Write failing unit tests for EventGrid table-fixed layout and column widths
  - [x] 1.2 Write failing unit tests for EventRow truncation on text cells (comma-containing and long text)
  - [x] 1.3 Update EventGrid to use `table-fixed` layout and add width classes to `<th>` elements
  - [x] 1.4 Update EventRow to add `truncate` class and `title` attribute to text `<td>` cells
  - [x] 1.5 Run unit tests and verify all pass
  - [x] 1.6 Write property-based test: for any StarredEvent with comma-containing fields, rendered EventRow has truncation classes [Property 1]
  - [x] 1.7 Run property-based test and verify it passes

## Bug 2: ICS Source URL Fix

- [x] 2. Add `url` field to ICSEvent type and update ICS parser
  - [x] 2.1 Add `readonly url: string | null` to `ICSEvent` interface in `src/core/types.ts`
  - [x] 2.2 Write failing unit test: parseICS extracts `url` field from VEVENT with `URL:` property
  - [x] 2.3 Write failing unit test: parseICS returns `url: null` when VEVENT has no `URL:` property
  - [x] 2.4 Update `parseICS` in `src/core/ics-parser.ts` to extract `URL` property into `url` field
  - [x] 2.5 Run parser unit tests and verify all pass

- [x] 3. Refactor buildDescription and add URL property to ICS output (TDD)
  - [x] 3.1 Write failing unit test: generateICS emits `URL:` property when sourceUrl is non-null
  - [x] 3.2 Write failing unit test: generateICS DESCRIPTION does not contain source URL or localized source label when sourceUrl is non-null
  - [x] 3.3 Write failing unit test: generateICS omits `URL:` property when sourceUrl is null
  - [x] 3.4 Write failing unit test: buildDescription returns only description text (no source URL appended)
  - [x] 3.5 Refactor `buildDescription` to remove sourceUrl/locale parameters — return description or null
  - [x] 3.6 Add `URL:{sourceUrl}` line to VEVENT output in `generateICS` when sourceUrl is non-null
  - [x] 3.7 Update existing ICS unit tests to reflect new DESCRIPTION behavior (remove source URL expectations)
  - [x] 3.8 Run all ICS unit tests and verify all pass

- [x] 4. Update ICS property-based tests for URL property
  - [x] 4.1 Write property-based test: for any StarredEvent with non-null sourceUrl, ICS output has URL property and DESCRIPTION does not contain sourceUrl [Property 3]
  - [x] 4.2 Write property-based test: for any StarredEvent with null sourceUrl, ICS output has no URL property and DESCRIPTION is unchanged [Property 4]
  - [x] 4.3 Update existing ics-roundtrip property test to verify `url` field round-trips correctly
  - [x] 4.4 Run all property-based tests and verify they pass

## Verification

- [x] 5. Run full test suite and typecheck
  - [x] 5.1 Run `pnpm run typecheck` and fix any type errors
  - [x] 5.2 Run `pnpm run test` and verify all tests pass
  - [x] 5.3 Run `pnpm run lint` and fix any lint issues
