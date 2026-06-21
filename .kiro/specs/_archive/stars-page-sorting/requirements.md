# Requirements Document

## Introduction

The Stars Page (full-page view of starred events) currently shares a single `sortOrder` storage key with the popup. This causes two problems: (1) changing sort in the popup carries over to the stars page unexpectedly, and (2) when non-time-based sorts (alphabetical, starred-at) are active, the day-grouping headers appear in nonsensical order because grouping happens after sorting. This feature decouples the stars page sort from the popup and conditionally removes day-grouping for sort orders where it does not make sense.

## Glossary

- **Stars_Page**: The full-page view (`stars.html`) that displays all starred events in a grid with day-group headers.
- **Popup**: The browser action popup that shows a compact list of starred events.
- **Sort_Order**: One of four ordering strategies: chronological, reverse-chronological, alphabetical-by-title, or starred-desc.
- **Time_Based_Sort**: A Sort_Order where events are ordered by their start date-time (chronological or reverse-chronological).
- **Non_Time_Based_Sort**: A Sort_Order where events are ordered by a criterion unrelated to their calendar date (alphabetical-by-title or starred-desc).
- **Day_Group**: A visual section in the EventGrid that groups events sharing the same start date under a date header (e.g., "Måndag 22 juni").
- **EventGrid**: The table component on the Stars_Page that renders events, optionally grouped by date.
- **SortSelector**: The shared dropdown component that lets users pick a Sort_Order.

## Requirements

### Requirement 1: Independent Stars Page Sort State

**User Story:** As a user, I want the Stars Page sort order to be independent from the popup sort order, so that changing sort in one view does not unexpectedly affect the other.

#### Acceptance Criteria

1. WHEN the Stars_Page is opened, THE Stars_Page SHALL initialize its sort order to chronological using local in-memory state without reading the persisted `sortOrder` storage key.
2. WHEN the user changes the Sort_Order on the Stars_Page, THE Stars_Page SHALL apply the new sort order to the displayed events using local in-memory state only and SHALL NOT send a SET_SORT_ORDER message or persist the selection to the `sortOrder` storage key.
3. WHEN the user changes the Sort_Order in the Popup, THE Popup SHALL persist the selection to the shared `sortOrder` storage key via the SET_SORT_ORDER message.
4. WHILE the Stars_Page is open, IF the `sortOrder` storage key is changed by the Popup, THEN THE Stars_Page SHALL retain its current local sort order without re-sorting or updating to the new stored value.
5. WHEN the Stars_Page is reopened after being closed, THE Stars_Page SHALL reset its sort order to chronological.

### Requirement 2: Conditional Day-Grouping Based on Sort Order

**User Story:** As a user, I want the Stars Page to show day-group headers only when a time-based sort is active, so that the grouping always makes logical sense.

#### Acceptance Criteria

1. WHILE a Time_Based_Sort is active on the Stars_Page, THE EventGrid SHALL display events grouped under Day_Group headers ordered by date in the direction matching the active Sort_Order.
2. WHILE a Non_Time_Based_Sort is active on the Stars_Page, THE EventGrid SHALL display events in a flat list without Day_Group headers, ordered according to the active Non_Time_Based_Sort.
3. WHEN the user switches from a Time_Based_Sort to a Non_Time_Based_Sort, THE EventGrid SHALL remove Day_Group headers and display a flat list without requiring a page reload.
4. WHEN the user switches from a Non_Time_Based_Sort to a Time_Based_Sort, THE EventGrid SHALL restore Day_Group headers without requiring a page reload.
5. WHILE a Non_Time_Based_Sort is active on the Stars_Page, THE EventGrid SHALL continue to display the table column headers.

### Requirement 3: Day-Group Ordering Consistency

**User Story:** As a user, I want day-group headers to appear in the correct date order matching the active sort direction, so that the page layout is predictable.

#### Acceptance Criteria

1. WHILE the chronological Sort_Order is active, THE EventGrid SHALL display Day_Group headers in ascending date order (earliest first).
2. WHILE the reverse-chronological Sort_Order is active, THE EventGrid SHALL display Day_Group headers in descending date order (latest first).
3. WHILE a Time_Based_Sort is active, THE EventGrid SHALL display events within each Day_Group in ascending start time order.
4. WHILE a Time_Based_Sort is active, IF two events within the same Day_Group have identical start times, THEN THE EventGrid SHALL order them by event id ascending as a deterministic tiebreaker.

### Requirement 4: Popup Sort Behavior Unchanged

**User Story:** As a user, I want the popup sort behavior to remain exactly as it is today, so that existing functionality is not disrupted.

#### Acceptance Criteria

1. WHEN the Popup is opened, THE Popup SHALL fetch and apply the persisted Sort_Order from the shared `sortOrder` storage key.
2. IF the shared `sortOrder` storage key is absent or contains an invalid value when the Popup is opened, THEN THE Popup SHALL default to chronological Sort_Order.
3. WHEN the user changes the Sort_Order in the Popup, THE Popup SHALL persist the new value to the shared `sortOrder` storage key and immediately re-sort the displayed events.
4. WHEN the starred events in storage change while the Popup is open, THE Popup SHALL re-fetch and re-sort the displayed events using the current Sort_Order.
5. THE Popup SHALL display events in a flat list without Day_Group headers regardless of Sort_Order.
