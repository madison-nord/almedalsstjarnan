# Requirements Document

## Introduction

This specification defines a "Bulk Star All" feature for the Almedalsstjärnan Chrome extension. Currently, users must star events one by one from the programme page, manually clicking "Load More" to paginate through results and individually clicking star buttons. This feature adds a bulk action that stars all events matching the user's current search or filter criteria in a single action, including events not yet loaded on the page. The bulk operation programmatically triggers the site's pagination to load all matching events, scrapes them, and stars them in storage.

## Glossary

- **Programme_Page**: The Almedalsveckan event listing page at `almedalsveckan.info/rg/almedalsveckan/officiellt-program/program-2026` where events are displayed as Event_Cards with pagination via a "Visa fler" button.
- **Bulk_Star_Button**: A floating action button injected by the content script onto the Programme_Page that triggers the bulk-star operation for all events matching the current filter state.
- **Load_More_Button**: The host page's native "Visa fler" button that loads the next batch of events into the DOM when clicked.
- **Event_Card**: An `li` DOM element on the Programme_Page containing `.event-information` and representing a single event.
- **Content_Script**: The extension's content script (`content-script.ts`) that runs on the Programme_Page, processes Event_Cards, and injects Star_Buttons.
- **Background_Worker**: The extension's Manifest V3 service worker that handles all storage operations via message passing.
- **Bulk_Star_Coordinator**: The module responsible for orchestrating the bulk-star workflow: expanding all pages, collecting events, and sending them to storage.
- **Progress_Indicator**: A floating UI element shown during the bulk operation that displays the current progress (events found, events starred) and provides a cancel mechanism.
- **Filter_State**: The current search text or category filters active on the Programme_Page that determine which events are visible in the listing.

## Requirements

### Requirement 1: Bulk Star Button Injection

**User Story:** As a user browsing the programme page, I want to see a clearly labelled action button for bulk-starring, so that I can discover and trigger the feature without modifying my workflow.

#### Acceptance Criteria

1. WHEN the content script initializes on the Programme_Page, THE Content_Script SHALL inject a Bulk_Star_Button into the page within a Shadow DOM host (open mode) for style isolation.
2. THE Bulk_Star_Button SHALL be rendered as a fixed-position element anchored to the top-right corner of the viewport with a minimum offset of 16px from viewport edges, styled as a filled rectangular button with a text label so it is visually distinct from the circular icon-only individual Star_Buttons.
3. THE Bulk_Star_Button SHALL display a localized label determined by the resolved effective locale: "Stjärnmärk alla" when locale is `sv`, "Star all" when locale is `en`.
4. WHEN zero Event_Cards are present in the DOM on the Programme_Page after the initial DOM scan completes, THE Bulk_Star_Button SHALL be hidden (display: none). THE Bulk_Star_Button SHALL start visible on page load and only hide after confirming zero Event_Cards exist. WHEN one or more Event_Cards are present in the DOM (whether from initial page load or dynamically added), THE Bulk_Star_Button SHALL be shown regardless of how the cards were added.
5. THE Bulk_Star_Button SHALL meet accessibility requirements: keyboard-focusable via Tab key, minimum 44×44px touch target, `aria-label` matching the visible label text, and a visible focus indicator using a 2px solid outline on `:focus-visible`.
6. WHILE the Bulk_Star_Button is hidden due to zero Event_Cards, IF the user navigates or filters such that Event_Cards appear in the DOM, THEN THE Content_Script SHALL make the Bulk_Star_Button visible within the same page session without requiring a page reload.

### Requirement 2: Pagination Expansion

**User Story:** As a user who wants to bulk-star filtered results, I want the extension to automatically load all paginated events, so that I do not need to manually click "Load More" repeatedly.

#### Acceptance Criteria

1. WHEN the user activates the Bulk_Star_Button, THE Bulk_Star_Coordinator SHALL detect whether a Load_More_Button exists on the Programme_Page by querying for an anchor element whose class contains `load-more-button`.
2. WHILE a Load_More_Button is present in the DOM and not hidden (i.e., has a non-zero `offsetParent` or is not removed from the document), THE Bulk_Star_Coordinator SHALL programmatically click the Load_More_Button, wait for at least one new Event_Card to appear in the DOM (detected by an increase in the total Event_Card count), and then check again for the Load_More_Button.
3. WHEN the Load_More_Button is no longer present in the DOM after a click, THE Bulk_Star_Coordinator SHALL conclude that all available events have been loaded.
4. IF a Load_More_Button click does not produce any new Event_Cards within 10 seconds, THEN THE Bulk_Star_Coordinator SHALL stop the pagination expansion and proceed with the events currently loaded. IF new Event_Cards appear before the 10-second timeout elapses, THE Bulk_Star_Coordinator SHALL continue pagination regardless of elapsed time.
5. WHILE pagination expansion is in progress, THE Progress_Indicator SHALL display the number of events loaded so far, updating after each pagination batch.
6. IF the Bulk_Star_Coordinator has clicked the Load_More_Button 100 times without the button disappearing, THEN THE Bulk_Star_Coordinator SHALL stop the pagination expansion and proceed with the events currently loaded.
7. THE Bulk_Star_Coordinator SHALL wait a minimum of 300 milliseconds between consecutive Load_More_Button clicks to allow the host page to process each pagination request.

### Requirement 3: Bulk Event Collection and Starring

**User Story:** As a user, I want all visible events to be starred in one operation after pagination is complete, so that I get a complete set of matching events in my starred list without manual effort.

#### Acceptance Criteria

1. WHEN pagination expansion completes, THE Bulk_Star_Coordinator SHALL collect all Event_Cards currently present in the DOM by querying `li` elements containing a `.event-information` descendant.
2. WHEN collecting Event_Cards, THE Bulk_Star_Coordinator SHALL normalize each card using the existing Event_Normalizer and exclude any card where normalization returns `ok: false`, incrementing a skipped counter for each excluded card.
3. WHEN processing normalized events, THE Bulk_Star_Coordinator SHALL check each event's starred state via a GET_STAR_STATE message to the Background_Worker and skip events that are already starred, incrementing an already-starred counter.
4. WHEN a normalized event is not already starred, THE Bulk_Star_Coordinator SHALL send a STAR_EVENT message to the Background_Worker containing the NormalizedEvent payload.
5. IF a STAR_EVENT message returns a response with `success: false` for a specific event, THEN THE Bulk_Star_Coordinator SHALL log a warning to the console including the event ID and continue processing the remaining events without aborting the batch.
6. WHILE the batch is being processed, THE Bulk_Star_Coordinator SHALL update the Progress_Indicator after each event is processed to show the current count of events processed out of the total to be processed.
7. WHEN all events in the batch have been processed, THE Bulk_Star_Coordinator SHALL update the Progress_Indicator to show the final summary: total events found, events newly starred, events already starred, and events that failed.
8. THE Bulk_Star_Coordinator SHALL process a maximum of 2000 Event_Cards per batch operation; if the DOM contains more than 2000 Event_Cards, only the first 2000 in DOM order SHALL be processed.

### Requirement 4: Progress Feedback and Cancellation

**User Story:** As a user triggering a bulk operation that may take several seconds, I want to see progress and have the ability to cancel, so that I stay informed and retain control.

#### Acceptance Criteria

1. WHEN the bulk-star operation begins, THE Progress_Indicator SHALL appear in a fixed position on the screen, showing a loading state with the text "Laddar evenemang..." (sv) or "Loading events..." (en).
2. WHILE pagination expansion is running, THE Progress_Indicator SHALL update to show the count of events loaded after each batch in the format "{count} evenemang hittade" (sv) or "{count} events found" (en).
3. WHILE event starring is running, THE Progress_Indicator SHALL update to show progress in the format "{completed} / {total}" indicating how many events have been sent to storage.
4. THE Progress_Indicator SHALL include a cancel button with localized text: "Avbryt" (sv) or "Cancel" (en), that is keyboard-focusable, has a minimum 44×44px touch target, and displays a visible focus indicator.
5. WHEN the user clicks the cancel button during pagination expansion, THE Bulk_Star_Coordinator SHALL stop clicking the Load_More_Button after the current pending click resolves and proceed to star the events already loaded. IF cancellation fails to stop pagination (e.g., a click was already in flight), THE Bulk_Star_Coordinator SHALL allow the current click to complete and then proceed to the starring phase with all events loaded up to that point.
6. WHEN the user clicks the cancel button during the starring phase, THE Bulk_Star_Coordinator SHALL stop sending additional STAR_EVENT messages, keeping events already starred intact.
7. WHEN the bulk-star operation completes (all events processed), THE Progress_Indicator SHALL display a completion summary showing events newly starred and events already starred for 5 seconds and then auto-dismiss, or dismiss immediately on user click.
8. WHEN the bulk-star operation is cancelled by the user, THE Progress_Indicator SHALL display a cancellation summary showing events starred before cancellation and total events found for 5 seconds and then auto-dismiss, or dismiss immediately on user click.
9. THE Progress_Indicator SHALL expose an `aria-live="polite"` region so that progress updates are announced to screen readers, and SHALL be navigable via keyboard (Tab to reach cancel button).

### Requirement 5: Filter-Awareness

**User Story:** As a user who has filtered the programme page by search text or category, I want the bulk-star to only target the filtered results, so that I star exactly the events I'm interested in.

#### Acceptance Criteria

1. THE Bulk_Star_Coordinator SHALL only process Event_Cards that are present in the DOM as `li` elements containing `.event-information` after pagination expansion completes, treating DOM presence as the sole indicator of filter-match since the host page removes non-matching cards from the DOM rather than hiding them. THE Bulk_Star_Coordinator SHALL NOT process any event whose corresponding Event_Card is absent from the DOM at the time of collection.
2. WHEN the user has applied search text or category filters on the Programme_Page, THE Bulk_Star_Coordinator SHALL bulk-star only the Event_Cards present in the DOM after pagination expansion, which inherently reflects the host page's filtered result set.
3. WHEN no filters are active on the Programme_Page, THE Bulk_Star_Coordinator SHALL bulk-star all events across all paginated pages.
4. IF the user changes filters on the Programme_Page while a bulk-star operation is in progress, THEN THE Bulk_Star_Coordinator SHALL continue processing only the set of Event_Cards collected at the start of the starring phase without re-scanning the DOM. The operation SHALL NOT be terminated due to filter changes.

### Requirement 6: Star Button Synchronization

**User Story:** As a user who has bulk-starred events, I want the individual Star_Buttons on the page to immediately reflect the new starred state, so that the UI is consistent.

#### Acceptance Criteria

1. WHEN the Bulk_Star_Coordinator successfully stars an event, THE Star_Button for that event on the page SHALL update to the starred state (`aria-pressed="true"`, filled star icon) via the existing cross-tab storage change listener.
2. WHEN all bulk-starring is complete, ALL individual Star_Buttons on the page for events that were bulk-starred SHALL display the starred state without requiring a page reload.
3. IF the storage change listener fires during the bulk operation, THEN THE Star_Buttons SHALL update incrementally as each event is confirmed starred rather than waiting for the entire batch to complete.
4. WHEN pagination expansion loads new Event_Cards into the DOM, THE Content_Script's MutationObserver SHALL inject Star_Buttons into those cards and register them in the starButtonMap before the starring phase begins, so that subsequent storage change events can update them.
5. IF a STAR_EVENT message fails for a specific event during the bulk operation, THEN THE Star_Button for that event SHALL remain in the unstarred state (`aria-pressed="false"`, outlined star icon).

### Requirement 7: Error Handling and Resilience

**User Story:** As a user performing a bulk operation, I want the extension to handle errors gracefully, so that partial failures do not lose my progress or crash the extension.

#### Acceptance Criteria

1. IF the content script encounters a DOM structure it cannot parse during bulk collection, THEN THE Bulk_Star_Coordinator SHALL skip that Event_Card, log a warning to the console with the `[Almedalsstjärnan]` prefix, and continue processing the remaining Event_Cards.
2. IF a STAR_EVENT message returns `success: false` or the messaging call throws an exception, THEN THE Bulk_Star_Coordinator SHALL retry that event exactly once after a 1-second (1000ms) delay; IF the retry also fails, THEN THE Bulk_Star_Coordinator SHALL skip the event, log a warning to the console, and count it as a failed event toward the abort threshold.
3. IF more than 50% of all STAR_EVENT messages attempted in the entire bulk operation (including events that failed after retry) result in failure, THEN THE Bulk_Star_Coordinator SHALL abort the operation and display an error message in the Progress_Indicator: "Något gick fel. Försök igen." (sv) or "Something went wrong. Try again." (en).
4. WHEN the bulk operation is aborted due to errors, THE Progress_Indicator SHALL display the count of events successfully starred before the abort, remain visible for 5 seconds, and then auto-dismiss (or dismiss immediately on user click).
5. THE Bulk_Star_Coordinator SHALL never throw unhandled exceptions — all errors SHALL be caught and logged to the console with a `[Almedalsstjärnan]` prefix.

### Requirement 8: Performance and Rate Limiting

**User Story:** As a user bulk-starring potentially hundreds of events, I want the operation to not freeze the browser or overload the extension storage, so that the experience remains smooth.

#### Acceptance Criteria

1. THE Bulk_Star_Coordinator SHALL send STAR_EVENT messages in sequential order with a minimum 50ms delay between each message to avoid overwhelming the Background_Worker storage mutex.
2. WHILE the bulk-star operation is in progress, THE Programme_Page SHALL remain scrollable and interactive (the operation SHALL NOT block the main thread for more than 100ms at a time).
3. WHEN more than 200 events are being processed, THE Bulk_Star_Coordinator SHALL process events in batches of 50, yielding to the main thread between batches using `requestIdleCallback` or `setTimeout(fn, 0)`. IF a bulk operation was started with fewer than 200 events and the count increases beyond 200 during processing (e.g., due to late DOM additions), THE Bulk_Star_Coordinator SHALL continue in the original non-batch mode for that operation.
4. THE Bulk_Star_Button SHALL be disabled while a bulk-star operation is in progress to prevent concurrent operations.
