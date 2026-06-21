# Requirements Document

## Introduction

This specification addresses four related issues in the Almedalsstjärnan Chrome extension: a star button animation bug where unrelated buttons visually "jump" on state changes, incomplete content scraping that misses most event detail sections, ensuring ICS exports contain the full scraped content, and a synchronization gap where the stars page does not react to language preference changes made in the popup.

## Glossary

- **Star_Button**: A Shadow DOM-isolated toggle button injected into each Event_Card on the programme page, reflecting the starred/unstarred state via `aria-pressed`.
- **Event_Card**: An `li` DOM element on almedalsveckan.info containing `.event-information` and one or more content sections (societal question, extended info, participants, event information, organiser details).
- **Content_Scraper**: The logic within the Event_Normalizer that extracts textual content from an Event_Card collapse section and assembles the `description` field.
- **Stars_Page**: The full-page view (`src/ui/stars/`) displaying all starred events in a grid with sort, filter, export, and bulk actions.
- **Popup**: The Chrome extension popup UI (`src/ui/popup/`) showing a compact list of starred events.
- **ICS_Generator**: The module (`src/core/ics-generator.ts`) that produces RFC 5545-compliant calendar files from starred event data.
- **Storage_Listener**: A callback registered via `adapter.onStorageChanged` that reacts to changes in `chrome.storage.local`.
- **Language_Preference**: A stored setting (`languagePreference` in `StorageSchema`) indicating the user's chosen locale (`sv`, `en`, or `null` for browser default).

## Requirements

### Requirement 1: Star Button Animation Stability

**User Story:** As a user browsing the programme page, I want starring or unstarring one event to animate only that button, so that other already-starred buttons do not visually jump.

#### Acceptance Criteria

1. WHEN `update(starred)` is called on a Star_Button that is already in the target state, THE Star_Button SHALL skip the re-render and leave the DOM unchanged (no `innerHTML` assignment, no attribute changes).
2. WHEN a user clicks a Star_Button to star an event, THE Star_Button for that event SHALL play the `star-pop` animation exactly once by setting `aria-pressed="true"` and re-inserting the filled SVG.
3. WHEN a user clicks a Star_Button to unstar an event, THE Star_Button for that event SHALL transition to the unstarred visual state (`aria-pressed="false"`, outlined SVG) without playing the `star-pop` animation.
4. WHEN a cross-tab storage change sets a Star_Button to a state it already holds, THE Star_Button SHALL not re-render and SHALL not trigger any CSS animation.
5. WHEN a cross-tab storage change sets a Star_Button to a new state, THE Star_Button SHALL update its visual state and play the `star-pop` animation only if transitioning to the starred state.
6. WHEN multiple Star_Buttons exist on the page for different events, starring one event SHALL NOT cause any visual change to Star_Buttons for other events.

### Requirement 2: Comprehensive Content Scraping

**User Story:** As a user starring events, I want the extension to capture all available content sections from the event detail area, so that my starred events contain the full description including societal context, extended info, participants, event metadata, and organiser details.

#### Acceptance Criteria

1. WHEN an Event_Card contains a "Beskrivning av samhällsfrågan" heading, THE Content_Scraper SHALL extract the text content of all sibling paragraph elements following that heading up to the next heading element or end of the container, and include the combined text in the `description` field under a "Beskrivning av samhällsfrågan" label.
2. WHEN an Event_Card contains a "Utökad information om evenemanget" heading, THE Content_Scraper SHALL extract the text content of all sibling paragraph elements following that heading up to the next heading element or end of the container, and include the combined text in the `description` field under a "Utökad information om evenemanget" label.
3. WHEN an Event_Card contains a "Medverkande" heading, THE Content_Scraper SHALL extract the text content of all sibling paragraph elements following that heading up to the next heading element or end of the container, and include the combined text in the `description` field under a "Medverkande" label.
4. WHEN an Event_Card contains an "Evenemangsinformation" heading, THE Content_Scraper SHALL extract the text content of all sibling paragraph elements following that heading up to the next heading element or end of the container, and include the combined text in the `description` field under an "Evenemangsinformation" label.
5. WHEN an Event_Card contains an "Arrangörsuppgifter" heading, THE Content_Scraper SHALL extract the text content of all sibling paragraph elements following that heading up to the next heading element or end of the container, and include the combined text in the `description` field under an "Arrangörsuppgifter" label.
6. THE Content_Scraper SHALL concatenate extracted sections in DOM order, separating each section with a blank line (`\n\n`), prefixing each with its heading text followed by a colon and a newline character (`\n`), and joining multiple paragraphs within a single section with a single newline character (`\n`).
7. WHEN an Event_Card has none of the five content sections, THE Content_Scraper SHALL set the `description` field to `null`.
8. WHEN an Event_Card has at least one content section present, THE Content_Scraper SHALL produce a non-null `description` field containing all available sections.
9. THE Content_Scraper SHALL trim leading and trailing whitespace from each extracted paragraph and from the final assembled description string.
10. IF a paragraph element within a content section contains only whitespace after trimming, THEN THE Content_Scraper SHALL exclude that paragraph from the section output.
11. THE Content_Scraper SHALL truncate the final assembled `description` string to a maximum of 10000 characters.

### Requirement 3: ICS Export with Full Content

**User Story:** As a user exporting starred events to a calendar, I want the ICS file DESCRIPTION field to contain all scraped content sections, so that my calendar entries have the complete event details.

#### Acceptance Criteria

1. WHEN a starred event has a non-null `description` field, THE ICS_Generator SHALL include the full `description` value in the VEVENT DESCRIPTION property.
2. WHEN the `description` field contains newline characters, THE ICS_Generator SHALL escape each newline as the literal two-character sequence `\n` per RFC 5545.
3. WHEN ICS generation is performed and the DESCRIPTION value contains backslash, comma, or semicolon characters, THE ICS_Generator SHALL escape them as `\\`, `\,`, and `\;` respectively per RFC 5545.
4. WHEN a DESCRIPTION line exceeds 75 octets, THE ICS_Generator SHALL fold that line per RFC 5545 line-folding rules, with each continuation line beginning with a single space character.
5. WHEN a starred event has a non-null `sourceUrl`, THE ICS_Generator SHALL append the source URL after the description content (or as the sole content if `description` is null), preceded by a newline and the locale-specific label: "Källa:" when locale is `sv`, "Source:" when locale is `en`, or "Source:" for any other locale value.
6. IF a starred event has both a null `description` and a null `sourceUrl`, THEN THE ICS_Generator SHALL omit the DESCRIPTION property from the VEVENT.

### Requirement 4: Stars Page Reacts to Language Preference Changes

**User Story:** As a user with both the popup and the stars page open, I want language changes in the popup to immediately update the stars page language, so that the interface stays consistent without requiring a manual refresh.

#### Acceptance Criteria

1. WHEN the `languagePreference` value changes in `chrome.storage.local`, THE Stars_Page SHALL detect the change via its Storage_Listener and extract the new value from the change event's `newValue` field.
2. WHEN the Stars_Page detects a `languagePreference` change, THE Stars_Page SHALL update its locale state to the new value (`'sv'`, `'en'`, or `null` for browser default) and re-render all localized strings across the page and its child components within 500ms of detection.
3. WHEN the Stars_Page detects a `languagePreference` change, THE Stars_Page SHALL use the new locale for subsequent ICS exports without requiring a page reload.
4. THE Stars_Page SHALL register a single Storage_Listener callback via `adapter.onStorageChanged` that handles both `starredEvents` and `languagePreference` changes, and SHALL remove the listener when the page unmounts.

### Requirement 5: Stars Page Reacts to Star Changes from Popup

**User Story:** As a user with both the popup and stars page open, I want starring or unstarring events in the popup to update the stars page in real time, so that the two views stay in sync.

#### Acceptance Criteria

1. WHEN the `starredEvents` value changes in `chrome.storage.local`, THE Stars_Page SHALL re-fetch the starred events from storage and re-render the event grid reflecting the current starred set within 1 second of the change event firing.
2. WHEN a new event is starred via the Popup, THE Stars_Page SHALL display the new event in its grid positioned according to the current sort order without requiring a page reload.
3. WHEN an event is unstarred via the Popup, THE Stars_Page SHALL remove that event from its grid without requiring a page reload.
4. WHEN a storage change for `starredEvents` is processed, THE Stars_Page SHALL preserve the current sort order, filter text, and scroll position, and SHALL remove from the selection state any event IDs that are no longer present in the updated event list.
5. IF multiple `starredEvents` storage changes arrive in rapid succession, THEN THE Stars_Page SHALL display only the result of the most recent fetch, discarding stale responses.
