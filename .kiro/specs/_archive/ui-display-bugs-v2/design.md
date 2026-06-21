# UI Display Bugs v2 — Bugfix Design

## Overview

This design addresses four UI display bugs in the Almedalsstjärnan browser extension:

1. **Duplicate Date/Time** — The popup `EventItem.tsx` renders `formatEventDateTime(...)` both in the collapsed summary and again inside the expanded detail block, showing the same date/time string twice when expanded.
2. **Auto-Unfolding on Star Click** — The star button host element is inserted inside `a.title h2` on the programme page. Clicks on the star button propagate up through the Shadow DOM boundary to the host page's native expand/collapse mechanism. The `handleClick` in `star-button.ts` lacks `stopPropagation()` and `preventDefault()`.
3. **Missing Expansion on Stars Page** — `EventRow.tsx` renders a flat table row with no expand/collapse toggle, unlike the popup's `EventItem.tsx` which provides this capability.
4. **Inconsistent Help Translations** — Swedish `helpModalTitle` is "Snabbguide" (Quick guide) while English is "What can Almedalsstjärnan do?" — different framing. Swedish `helpGroupStarsPageDesc` says "Öppna via länken i popupen" which is vague about which link to click.

The fixes are minimal and targeted: remove a duplicate render block, add event propagation stops, add an expand/collapse row detail, and update two Swedish translation strings.

## Glossary

- **Bug_Condition (C)**: The condition(s) that trigger each bug — expanded popup state, star button click on programme page, stars page event row view, or Swedish help modal display
- **Property (P)**: The desired correct behavior for each bug condition
- **Preservation**: Existing behaviors that must remain unchanged by the fixes
- **EventItem**: React component in `src/ui/popup/components/EventItem.tsx` rendering a starred event in the popup
- **EventRow**: React component in `src/ui/stars/components/EventRow.tsx` rendering a starred event row in the stars page grid
- **createStarButton**: Factory function in `src/extension/star-button.ts` that creates a Shadow DOM star toggle button
- **formatEventDateTime**: Formatter in `src/core/date-formatter.ts` producing a localized date/time string
- **Shadow DOM boundary**: The encapsulation boundary between the star button's shadow root and the host page DOM

## Bug Details

### Bug Condition

The bugs manifest under four distinct conditions:

**Bug 1 — Duplicate Date/Time:**
When an event is expanded in the popup AND the event has both `startDateTime` and `endDateTime`, the `formatEventDateTime` output appears twice — once in the always-visible summary area (line ~112 of EventItem.tsx) and again as the first child of the `{expanded && ...}` block (line ~125).

**Bug 2 — Auto-Unfolding:**
When a user clicks the star button on the programme page, the click event fires on the `<button>` inside the Shadow DOM. The event crosses the Shadow DOM boundary to the host element (`<span>` inside `a.title h2`). The host page's event card expand/collapse mechanism listens for clicks on the `a.title` or its descendants, causing the card to toggle open/closed.

**Bug 3 — Missing Expansion:**
The `EventRow` component renders only a flat `<tr>` with six data columns and an unstar button. There is no expand/collapse toggle to reveal additional details (description, topic, full time range) — unlike the popup's `EventItem` which has this capability via a chevron button and `expanded` state.

**Bug 4 — Inconsistent Translations:**
The Swedish `helpModalTitle` is "Snabbguide" while English is "What can Almedalsstjärnan do?" — semantically different (one is a label, the other is a question). The Swedish `helpGroupStarsPageDesc` says "Öppna via länken i popupen" which doesn't specify which link, while English says "Open the full list for a dedicated page with all your starred events in a sortable, searchable grid."

**Formal Specification:**

```
FUNCTION isBugCondition(input)
  INPUT: input of type UIInteraction
  OUTPUT: boolean
  
  RETURN isBugCondition_DuplicateDateTime(input)
         OR isBugCondition_AutoUnfold(input)
         OR isBugCondition_NoExpansion(input)
         OR isBugCondition_InconsistentTranslation(input)
END FUNCTION

FUNCTION isBugCondition_DuplicateDateTime(input)
  INPUT: input of type PopupEventItem
  OUTPUT: boolean
  RETURN input.expanded = true
         AND input.startDateTime IS NOT NULL
         AND input.endDateTime IS NOT NULL
END FUNCTION

FUNCTION isBugCondition_AutoUnfold(input)
  INPUT: input of type ClickEvent
  OUTPUT: boolean
  RETURN input.clickTarget = "star-button"
         AND input.context = "programme-page"
         AND input.event.propagates = true
END FUNCTION

FUNCTION isBugCondition_NoExpansion(input)
  INPUT: input of type StarsPageEventRow
  OUTPUT: boolean
  RETURN input.page = "stars"
         AND input.wantsDetails = true
         AND input.expandToggle IS NULL
END FUNCTION

FUNCTION isBugCondition_InconsistentTranslation(input)
  INPUT: input of type HelpModalContent
  OUTPUT: boolean
  RETURN input.locale = "sv"
         AND (input.key = "helpModalTitle" OR input.key = "helpGroupStarsPageDesc")
END FUNCTION
```

### Examples

- **Bug 1**: User expands event "Demokrati i förändring" in popup → sees "Mån 30 jun 09:00–10:00" in summary AND again as bold text in the expanded section
- **Bug 2**: User clicks star on "Hållbar utveckling" card → card unfolds/collapses AND star toggles (two actions instead of one)
- **Bug 3**: User views stars page with 12 events → cannot see description or topic for any event without clicking the source link and leaving the page
- **Bug 4**: User opens help modal in Swedish → sees "Snabbguide" title (a label) vs. English users see a question framing; Swedish stars page description says "via länken" without specifying which link

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Mouse clicks on the unstar button in popup must continue to trigger the undo flow
- Collapsed event items in popup must continue showing date/time, organiser, and location in the summary area
- Expanded event items in popup must continue showing topic and description
- Star button on programme page must continue toggling starred state and sending STAR_EVENT/UNSTAR_EVENT messages
- Cross-page consistency (multiple star buttons for same event update together) must continue working
- Stars page sorting, filtering, bulk actions, export, and unstar must continue functioning
- Help modal must continue displaying all 9 feature groups with icons, headings, and descriptions
- Help modal must continue supporting keyboard navigation, focus trapping, and Escape dismiss
- Native event card expand/collapse on programme page (via clicking card title directly) must continue working
- The EventGrid table layout, column widths, and section headers must remain unchanged

**Scope:**
All inputs that do NOT involve the four specific bug conditions should be completely unaffected by these fixes. This includes:
- All popup interactions except the expanded detail block content
- All programme page interactions except star button click propagation
- All stars page interactions except the new expand/collapse capability
- All help modal content except the two Swedish translation keys being updated

## Hypothesized Root Cause

Based on the code analysis, the root causes are confirmed:

1. **Duplicate Date/Time**: In `EventItem.tsx` lines 125-130, inside the `{expanded && ...}` block, there is an explicit `{event.startDateTime && event.endDateTime && (<p><span className="font-medium text-gray-700">{formatEventDateTime(...)}</span></p>)}` that duplicates the date/time already rendered in the summary area (line ~112). This was likely a copy-paste artifact when the expand feature was added.

2. **Auto-Unfolding**: In `star-button.ts`, the `handleClick` function (line ~140) does not call `event.stopPropagation()` or `event.preventDefault()` on the click event. While the button is inside Shadow DOM, composed events (like `click`) cross the shadow boundary and retarget to the host element. Since the host `<span>` is placed inside `a.title h2` (see `content-script.ts` line ~106), the click propagates up to the host page's card expand/collapse handler.

3. **Missing Expansion**: `EventRow.tsx` was designed as a simple flat row showing only the grid columns. The expand/collapse feature was implemented only in the popup's `EventItem.tsx` and was never ported to the stars page.

4. **Inconsistent Translations**: The Swedish translations were written independently of the English ones rather than being direct semantic translations. "Snabbguide" is a different framing than "What can Almedalsstjärnan do?" and "Öppna via länken i popupen" is vague compared to the English equivalent.

## Correctness Properties

Property 1: Bug Condition - No Duplicate Date/Time in Expanded Popup

_For any_ popup event item where the event is expanded and has both startDateTime and endDateTime, the rendered output SHALL contain exactly one occurrence of the formatted date/time string (in the collapsed summary area only, not repeated in the expanded detail section).

**Validates: Requirements 2.1**

Property 2: Bug Condition - Star Click Does Not Propagate

_For any_ click event on the star button in the programme page context, the click handler SHALL call stopPropagation() and preventDefault() so that the event does NOT reach parent elements, and the host page's event card expand/collapse state SHALL remain unchanged.

**Validates: Requirements 2.2**

Property 3: Bug Condition - Stars Page Rows Are Expandable

_For any_ event row on the stars page, the component SHALL render an expand/collapse toggle button that, when activated, reveals a details section containing the event's description, topic, and full time range.

**Validates: Requirements 2.3**

Property 4: Bug Condition - Swedish Translations Are Semantically Equivalent

_For any_ display of the help modal in Swedish, the `helpModalTitle` and `helpGroupStarsPageDesc` messages SHALL be semantically equivalent to their English counterparts — same framing, same level of specificity, no vague references.

**Validates: Requirements 2.4**

Property 5: Preservation - Existing Popup Behavior Unchanged

_For any_ interaction with the popup that does NOT involve the expanded detail block's date/time rendering, the fixed code SHALL produce exactly the same behavior as the original code, preserving collapsed summary content, expand toggle, unstar flow, and conflict indicators.

**Validates: Requirements 3.1, 3.2**

Property 6: Preservation - Star Toggle and Cross-Page Consistency Unchanged

_For any_ star button interaction, the fixed code SHALL continue to toggle starred state, send the appropriate message (STAR_EVENT/UNSTAR_EVENT), update all star buttons for that event, and handle errors with flash animation — preserving all existing star button functionality.

**Validates: Requirements 3.3, 3.7**

Property 7: Preservation - Stars Page Existing Functionality Unchanged

_For any_ stars page interaction that is NOT the new expand/collapse feature (sorting, filtering, bulk actions, export, unstar, checkbox selection), the fixed code SHALL produce exactly the same behavior as the original code.

**Validates: Requirements 3.4**

Property 8: Preservation - Help Modal Structure and Accessibility Unchanged

_For any_ help modal display, the fixed code SHALL continue to show all 9 feature groups with icons, headings, and descriptions, support keyboard navigation, focus trapping, and Escape dismiss.

**Validates: Requirements 3.5, 3.6**

## Fix Implementation

### Changes Required

**File**: `src/ui/popup/components/EventItem.tsx`

**Bug 1 Fix — Remove duplicate date/time from expanded block:**

Remove the conditional date/time rendering inside the `{expanded && ...}` block (the `{event.startDateTime && event.endDateTime && (<p>...formatEventDateTime...</p>)}` section). The date/time is already displayed in the always-visible summary area above.

---

**File**: `src/extension/star-button.ts`

**Bug 2 Fix — Stop click propagation:**

Modify the `handleClick` function to accept the `MouseEvent` parameter and call `event.stopPropagation()` and `event.preventDefault()` at the top of the handler, before any async logic. This prevents the composed click event from propagating through the Shadow DOM boundary to the host page's expand/collapse mechanism.

Change the event listener from:
```typescript
button.addEventListener('click', handleClick);
```
to pass the event object:
```typescript
function handleClick(event: MouseEvent): void {
  event.stopPropagation();
  event.preventDefault();
  // ... existing toggle logic
}
```

---

**File**: `src/ui/stars/components/EventRow.tsx`

**Bug 3 Fix — Add expand/collapse to EventRow:**

1. Add `useState<boolean>(false)` for `expanded` state
2. Add an expand/collapse toggle button (chevron icon) in the actions column or as a dedicated first column
3. When expanded, render a detail `<tr>` below the main row with a `<td colSpan={7}>` containing:
   - Full time range (already shown in column, but could include end time detail)
   - Topic (if not null)
   - Description (if not null, with `stripSourceUrl` applied)
4. Use `aria-expanded` on the toggle button
5. Use localized labels: `adapter.getMessage('expandEvent')` / `adapter.getMessage('collapseEvent')`

---

**File**: `_locales/sv/messages.json`

**Bug 4 Fix — Update Swedish translations:**

1. Change `helpModalTitle.message` from `"Snabbguide"` to `"Vad kan Almedalsstjärnan göra?"` (semantic equivalent of "What can Almedalsstjärnan do?")
2. Change `helpGroupStarsPageDesc.message` from `"En helsidesvy med alla dina stjärnmärkta evenemang i ett överskådligt rutnät. Öppna via länken i popupen."` to `"Klicka på 'Öppna hela listan' i popupen för en helsida med alla dina stjärnmärkta evenemang i ett sökbart, sorterbart rutnät."` (specifies exactly which button to click, matches English specificity)

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs on unfixed code, then verify the fixes work correctly and preserve existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fixes. Confirm the root cause analysis.

**Test Plan**: Write tests that render components in the buggy state and assert on the incorrect output to confirm the bugs exist.

**Test Cases**:
1. **Duplicate DateTime Test**: Render `EventItem` with expanded=true and valid dates → assert `formatEventDateTime` output appears more than once in the rendered output (will pass on unfixed code, confirming the bug)
2. **Star Click Propagation Test**: Create a star button inside a host element with a parent click listener → click the star button → assert parent listener was triggered (will pass on unfixed code, confirming propagation)
3. **No Expand Toggle Test**: Render `EventRow` with an event that has a description → query for an expand toggle button → assert it does NOT exist (will pass on unfixed code, confirming missing feature)
4. **Translation Inconsistency Test**: Load Swedish messages → assert `helpModalTitle` !== semantic equivalent of English `helpModalTitle` (will pass on unfixed code)

**Expected Counterexamples**:
- `formatEventDateTime` string appears twice in expanded EventItem DOM
- Click events on star button propagate to parent elements
- No expand/collapse button exists in EventRow
- Swedish title "Snabbguide" does not match the question framing of English

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed functions produce the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition_DuplicateDateTime(input) DO
  renderedOutput := renderEventItem_fixed(input)
  ASSERT occurrences(renderedOutput, formatEventDateTime(input)) = 1
END FOR

FOR ALL input WHERE isBugCondition_AutoUnfold(input) DO
  parentClickCount := countParentClicks_fixed(input)
  ASSERT parentClickCount = 0
END FOR

FOR ALL input WHERE isBugCondition_NoExpansion(input) DO
  toggleButton := findExpandToggle_fixed(input.row)
  ASSERT toggleButton IS NOT NULL
  click(toggleButton)
  ASSERT detailsVisible(input.row) = true
END FOR

FOR ALL input WHERE isBugCondition_InconsistentTranslation(input) DO
  svMessage := getMessage_fixed(input.key, "sv")
  enMessage := getMessage_fixed(input.key, "en")
  ASSERT semanticEquivalent(svMessage, enMessage)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug conditions do NOT hold, the fixed functions produce the same result as the original functions.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT F(input) = F'(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many random event configurations automatically
- It catches edge cases (null fields, empty strings, special characters) that manual tests miss
- It provides strong guarantees that the collapsible EventItem summary, star button toggle logic, and other unaffected paths remain identical

**Test Plan**: Observe behavior on UNFIXED code first, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Collapsed EventItem Preservation**: Generate random StarredEvent objects → render EventItem in collapsed state → verify output matches original (date/time once, organiser, location all present)
2. **Star Button Toggle Preservation**: Generate random star/unstar sequences → verify starred state and aria attributes match original behavior
3. **Stars Page Grid Preservation**: Generate random event lists → render EventGrid → verify table structure, column headers, and row content match original
4. **Help Modal Other Keys Preservation**: For all message keys OTHER than the two being changed, verify Swedish messages are unchanged

### Unit Tests

- Test EventItem renders date/time exactly once when expanded (Bug 1 fix check)
- Test EventItem still renders date/time in summary when collapsed (preservation)
- Test EventItem still renders topic and description when expanded (preservation)
- Test star button click handler calls stopPropagation and preventDefault (Bug 2 fix check)
- Test star button still toggles starred state on click (preservation)
- Test EventRow renders expand/collapse toggle button (Bug 3 fix check)
- Test EventRow expanded state shows description, topic, full time range (Bug 3 fix check)
- Test EventRow collapsed state matches original flat row (preservation)
- Test Swedish helpModalTitle matches English framing (Bug 4 fix check)
- Test Swedish helpGroupStarsPageDesc specifies button name clearly (Bug 4 fix check)
- Test all other Swedish message keys are unchanged (preservation)

### Property-Based Tests

- Generate random StarredEvent objects with varying null/non-null fields → render expanded EventItem → assert `formatEventDateTime` appears exactly once in output
- Generate random StarredEvent objects → render EventRow → toggle expand → verify description and topic appear if non-null, and do not appear if null
- Generate random StarredEvent objects → render collapsed EventItem → verify summary content (organiser, location, date/time) matches expected format for all input combinations
- Generate random event lists → render EventGrid → verify row count equals event count and table structure is consistent

### Integration Tests

- Test full popup flow: star event, open popup, expand event → verify no duplicate date/time
- Test programme page flow: inject star button, click star → verify host card does NOT expand/collapse
- Test stars page flow: load events, click expand on a row → verify details section appears with correct content
- Test help modal in both languages: open modal → verify all 9 groups display correctly with updated translations
