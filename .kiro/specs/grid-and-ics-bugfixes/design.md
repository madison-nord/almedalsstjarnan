# Grid & ICS Bugfix Design

## Overview

This design addresses two bugs in the Almedalsstjärnan browser extension:

1. **Grid layout overflow** — The Stars Page `<table>` cells have no overflow constraints. When event fields (especially organiser) contain commas or long text, the content pushes columns out of alignment. The fix adds Tailwind overflow/truncation utilities to `EventRow` and column-width constraints to `EventGrid`.

2. **Redundant source URL in ICS DESCRIPTION** — The `buildDescription` helper in `ics-generator.ts` appends a localized "Källa:/Source:" line to the DESCRIPTION field. This duplicates the source URL that should instead be a dedicated ICS `URL` property on the VEVENT. The fix removes the source URL from `buildDescription`, adds a `URL:` property line to the VEVENT output, and updates the ICS parser to extract it.

## Glossary

- **Bug_Condition (C1)**: Grid overflow — an event field (organiser, location, topic, title) contains a comma or exceeds the column's expected width, causing misalignment in the Stars Page table.
- **Bug_Condition (C2)**: ICS redundant URL — an event has a non-null `sourceUrl`, causing `buildDescription` to append a "Källa:/Source:" line to the DESCRIPTION field instead of using a dedicated `URL` property.
- **Property (P1)**: All table cells constrain their content via overflow handling so columns remain aligned regardless of field content.
- **Property (P2)**: The source URL appears only as an ICS `URL` property, never in the DESCRIPTION field.
- **Preservation**: Existing grid rendering for short/null fields, unstar action, ICS field generation (UID, DTSTAMP, DTSTART, DTEND, SUMMARY, LOCATION, ORGANIZER), CRLF line endings, and line folding must remain unchanged.
- **`buildDescription`**: Function in `src/core/ics-generator.ts` that constructs the DESCRIPTION field value from event description and source URL.
- **`EventRow`**: React component in `src/ui/stars/components/EventRow.tsx` rendering a single `<tr>` with six `<td>` cells.
- **`EventGrid`**: React component in `src/ui/stars/components/EventGrid.tsx` rendering the `<table>` with header and body rows.

## Bug Details

### Bug Condition 1: Grid Layout Overflow

The bug manifests when any text cell in the Stars Page table contains a comma or long text. The `<td>` elements have no `max-width`, `overflow`, or `text-overflow` constraints, so content pushes the column wider and misaligns adjacent columns.

**Formal Specification:**
```
FUNCTION isBugCondition_Grid(input)
  INPUT: input of type StarredEvent
  OUTPUT: boolean

  RETURN (input.organiser CONTAINS ","
         OR input.location CONTAINS ","
         OR input.title CONTAINS ","
         OR input.topic CONTAINS ","
         OR LENGTH(input.organiser) > columnExpectedWidth
         OR LENGTH(input.location) > columnExpectedWidth
         OR LENGTH(input.title) > columnExpectedWidth)
        AND tableColumnsMisaligned(renderEventRow(input))
END FUNCTION
```

### Bug Condition 2: Redundant Source URL in ICS DESCRIPTION

The bug manifests when an event has a non-null `sourceUrl`. The `buildDescription` function appends a "Källa:/Source:" line to the DESCRIPTION field. This source URL should instead be a dedicated ICS `URL` property.

**Formal Specification:**
```
FUNCTION isBugCondition_ICS(input)
  INPUT: input of type { event: StarredEvent, locale: 'sv' | 'en' }
  OUTPUT: boolean

  icsOutput := generateICS([input.event], input.locale)
  parsed := parseICS(icsOutput)
  description := parsed.events[0].description

  RETURN input.event.sourceUrl IS NOT NULL
         AND description CONTAINS input.event.sourceUrl
END FUNCTION
```

### Examples

- **Grid Bug**: Event with `organiser: "Org A, Org B"` renders with the organiser cell expanding, pushing date-time and location columns to the right and off-screen.
- **Grid Bug**: Event with `location: "Donners plats, Visby"` causes the location cell to overflow into the topic column.
- **ICS Bug**: Event with `description: "Panelsamtal"` and `sourceUrl: "https://almedalsveckan.info/event/abc123"` produces `DESCRIPTION:Panelsamtal\nKälla: https://...` — the URL is embedded in the description text instead of being a separate `URL:https://...` property.
- **ICS Bug**: Event with `description: null` and `sourceUrl: "https://..."` produces `DESCRIPTION:Källa: https://...` — the entire DESCRIPTION field exists only to hold the source URL.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Events with short text and no commas render with all six columns properly aligned (Req 3.1)
- Events with null optional fields (organiser, location, topic) render empty cells without layout issues (Req 3.2)
- Clicking the unstar action removes the event from the displayed list (Req 3.3)
- Events with null sourceUrl omit both the `URL` property and any source line from DESCRIPTION (Req 3.4)
- Events with non-null description and null sourceUrl include only the description text in DESCRIPTION (Req 3.5)
- Events with null description and null sourceUrl omit the DESCRIPTION field entirely (Req 3.6)
- ICS output uses CRLF line endings and proper line folding per RFC 5545 (Req 3.7)
- All other VEVENT fields (UID, DTSTAMP, DTSTART, DTEND, SUMMARY, LOCATION, ORGANIZER) remain unchanged (Req 3.8)

**Scope:**
All inputs that do NOT involve comma-containing or long text fields should render identically. All ICS output for events with null sourceUrl should be identical to current behavior.

## Hypothesized Root Cause

### Bug 1: Grid Layout Overflow

1. **Missing overflow constraints on `<td>` elements**: The `EventRow` component's `<td>` cells use only `px-3 py-2 text-sm` classes with no `max-width`, `overflow-hidden`, `text-ellipsis`, or `truncate` utilities. Long text simply expands the cell.

2. **No `table-fixed` layout on `<table>`**: The `EventGrid` component uses `w-full border-collapse` but not `table-fixed`. Without `table-fixed`, the browser's auto layout algorithm distributes column widths based on content, allowing long content to dominate.

3. **No column width hints**: The `<th>` elements have no width classes, so the browser has no guidance on how to distribute space.

### Bug 2: Redundant Source URL in ICS DESCRIPTION

1. **`buildDescription` appends source URL to DESCRIPTION**: The function at lines 100-116 of `ics-generator.ts` concatenates the event description with a localized "Källa:/Source:" line containing the sourceUrl. This was the original design but is now considered a bug — the URL should be a dedicated ICS property.

2. **No `URL` property in VEVENT output**: The `generateICS` function does not emit a `URL:` line for the VEVENT, so the source URL has nowhere to go except the DESCRIPTION field.

## Correctness Properties

Property 1: Bug Condition - Grid cells constrain content with overflow handling

_For any_ StarredEvent where any text field (title, organiser, location, topic) contains a comma or exceeds typical column width, the rendered EventRow SHALL have all six `<td>` cells with overflow-constraining CSS (truncate or overflow-hidden with text-ellipsis) so that columns remain aligned.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Grid renders correctly for normal content

_For any_ StarredEvent where text fields are short and contain no commas, the rendered EventGrid SHALL produce the same visual layout as before the fix, with all six columns properly aligned and no content cut off.

**Validates: Requirements 3.1, 3.2, 3.3**

Property 3: Bug Condition - Source URL as dedicated ICS URL property

_For any_ StarredEvent with a non-null sourceUrl, the generated ICS output SHALL include a `URL:` property on the VEVENT containing the sourceUrl, and the DESCRIPTION field SHALL NOT contain the sourceUrl or any localized source label.

**Validates: Requirements 2.4, 2.5**

Property 4: Preservation - ICS output unchanged for null sourceUrl

_For any_ StarredEvent with a null sourceUrl, the generated ICS output SHALL NOT include a `URL:` property, and the DESCRIPTION field SHALL contain only the event description (or be omitted if description is also null), identical to the original behavior.

**Validates: Requirements 3.4, 3.5, 3.6, 3.7, 3.8**

## Fix Implementation

### Changes Required

#### Bug 1: Grid Layout Overflow

**File**: `src/ui/stars/components/EventGrid.tsx`

**Specific Changes**:
1. **Add `table-fixed` to `<table>`**: Change `className="w-full border-collapse"` to `className="w-full border-collapse table-fixed"` so the browser uses fixed layout algorithm.
2. **Add width hints to `<th>` elements**: Assign proportional widths to columns so they don't collapse or expand based on content. Suggested distribution:
   - Title: ~25% (wider for links)
   - Organiser: ~20%
   - Date & time: ~20%
   - Location: ~15%
   - Topic: ~10%
   - Actions: ~10%

**File**: `src/ui/stars/components/EventRow.tsx`

**Specific Changes**:
1. **Add `truncate` class to text `<td>` elements**: Add `truncate` (which applies `overflow-hidden`, `text-overflow: ellipsis`, `white-space: nowrap`) to the title, organiser, location, and topic cells.
2. **Add `title` attribute for truncated content**: Add a `title` attribute to truncated cells so users can see the full text on hover.

#### Bug 2: Redundant Source URL in ICS DESCRIPTION

**File**: `src/core/ics-generator.ts`

**Function**: `buildDescription`

**Specific Changes**:
1. **Remove source URL from `buildDescription`**: Remove the `sourceUrl` parameter and the logic that appends the localized source label. The function should return only the event description (or null if description is null).
2. **Simplify `buildDescription` signature**: Change from `(description, sourceUrl, locale)` to `(description)` — it now just returns the description or null.
3. **Add `URL` property to VEVENT output**: In `generateICS`, after the DESCRIPTION line, add `URL:{sourceUrl}` when `event.sourceUrl` is not null. The URL value does not need ICS text escaping (it's a URI, not a text value).

**File**: `src/core/ics-parser.ts`

**Specific Changes**:
1. **Parse `URL` property**: Add a `url` field to `ICSEvent` and extract it from `URL:` lines in the VEVENT parser.

**File**: `src/core/types.ts`

**Specific Changes**:
1. **Add `url` field to `ICSEvent`**: Add `readonly url: string | null` to the `ICSEvent` interface.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs on unfixed code, then verify the fixes work correctly and preserve existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix. Confirm or refute the root cause analysis.

**Test Plan — Bug 1 (Grid)**:
Write unit tests that render `EventRow` and `EventGrid` with comma-containing fields and assert overflow handling. Run on unfixed code to observe failures.

**Test Cases**:
1. **Comma in organiser**: Render EventRow with `organiser: "Org A, Org B"` — assert truncation class present (will fail on unfixed code)
2. **Long organiser**: Render EventRow with a 100-character organiser — assert truncation (will fail on unfixed code)
3. **Comma in location**: Render EventRow with `location: "Donners plats, Visby"` — assert truncation (will fail on unfixed code)
4. **Table-fixed layout**: Render EventGrid — assert `table-fixed` class on `<table>` (will fail on unfixed code)

**Test Plan — Bug 2 (ICS)**:
Write unit tests that generate ICS for events with sourceUrl and assert the URL property exists and DESCRIPTION is clean. Run on unfixed code to observe failures.

**Test Cases**:
1. **URL property present**: Generate ICS for event with sourceUrl — assert `URL:` line in output (will fail on unfixed code)
2. **DESCRIPTION without source label**: Generate ICS for event with description and sourceUrl — assert DESCRIPTION does not contain "Källa:" or "Source:" (will fail on unfixed code)
3. **Description-only DESCRIPTION**: Generate ICS for event with description and sourceUrl — assert DESCRIPTION equals just the description text (will fail on unfixed code)

**Expected Counterexamples**:
- Grid: `<td>` elements lack truncation classes, table lacks `table-fixed`
- ICS: DESCRIPTION contains source URL, no `URL:` property line exists

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed code produces the expected behavior.

**Pseudocode — Bug 1:**
```
FOR ALL event WHERE event has comma-containing or long text fields DO
  rendered := renderEventRow(event)
  ASSERT all text <td> elements have truncate class
  ASSERT table has table-fixed class
  ASSERT all six columns are present and aligned
END FOR
```

**Pseudocode — Bug 2:**
```
FOR ALL event WHERE event.sourceUrl IS NOT NULL DO
  ics := generateICS_fixed([event], locale)
  parsed := parseICS(ics)
  ASSERT parsed.events[0].url == event.sourceUrl
  ASSERT parsed.events[0].description DOES NOT CONTAIN event.sourceUrl
  ASSERT parsed.events[0].description DOES NOT CONTAIN "Källa:" OR "Source:"
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed code produces the same result as the original.

**Pseudocode — Bug 1:**
```
FOR ALL event WHERE event fields are short and contain no commas DO
  ASSERT renderEventRow_fixed(event) renders all six columns correctly
  ASSERT unstar action works
END FOR
```

**Pseudocode — Bug 2:**
```
FOR ALL event WHERE event.sourceUrl IS NULL DO
  ASSERT generateICS_fixed([event], locale) produces same output as generateICS_original([event], locale)
  // Specifically: no URL property, DESCRIPTION unchanged
END FOR
```

**Testing Approach**: Property-based testing is recommended for ICS preservation checking because:
- It generates many event combinations automatically across the input domain
- It catches edge cases with null/non-null field combinations
- It provides strong guarantees that behavior is unchanged for events without sourceUrl

### Unit Tests

- EventRow renders truncated cells for comma-containing fields
- EventRow renders `title` attribute on truncated cells
- EventGrid uses `table-fixed` layout
- EventGrid column headers have width classes
- `buildDescription` returns only description text (no source URL)
- `generateICS` emits `URL:` property when sourceUrl is non-null
- `generateICS` omits `URL:` property when sourceUrl is null
- `parseICS` extracts `url` field from VEVENT
- Existing ICS tests updated to reflect new DESCRIPTION behavior

### Property-Based Tests

- Generate random StarredEvents with non-null sourceUrl: assert ICS output has `URL:` property and DESCRIPTION does not contain sourceUrl
- Generate random StarredEvents with null sourceUrl: assert ICS output has no `URL:` property and DESCRIPTION matches original behavior
- ICS round-trip property updated: assert `url` field round-trips correctly

### Integration Tests

- Stars Page renders correctly with real-world comma-containing event data
- ICS export produces valid calendar file with URL properties
- Full star → export flow with comma-containing events
