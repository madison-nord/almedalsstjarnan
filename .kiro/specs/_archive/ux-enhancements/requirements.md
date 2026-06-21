# Requirements Document

## Introduction

This specification covers a comprehensive set of UX enhancements to the Almedalsstjärnan browser extension. The improvements span seven areas: popup interaction improvements, stars page usability, visual design refinement, date/time formatting, user guidance, reliability and feedback, and scheduling conflict detection. Together these changes transform the extension from a functional prototype into a polished, user-friendly tool.

Visual design decisions require human review and approval before implementation. Requirements involving visual direction include explicit checkpoints for presenting design options.

## Glossary

- **Extension**: The Almedalsstjärnan browser extension.
- **Popup_UI**: The browser action popup (360px wide, 480px min height) showing starred events.
- **Stars_Page**: The dedicated extension page displaying all starred events with sort, filter, and export.
- **Star_Button**: The interactive star control injected into event cards on the host page.
- **Event_Card**: A DOM element on the host page representing a single Almedalsveckan event.
- **Date_Formatter**: A shared utility module that converts ISO 8601 date-time strings into locale-appropriate human-readable formats.
- **Config_Module**: A shared module exporting configurable values (e.g., year-specific date mappings) that can be updated annually without code changes.
- **Badge**: The small numeric indicator displayed on the extension toolbar icon showing the count of starred events.
- **Undo_Toast**: A brief, dismissible notification offering the user a chance to reverse a destructive action.
- **Conflict_Indicator**: A visual treatment (design TBD, requires human approval) that clearly communicates which starred events have overlapping time slots.
- **Onboarding_View**: An informational section explaining the extension's purpose and usage, shown on first run and re-accessible via a help link.
- **Language_Toggle**: A user-facing control allowing manual override of the display language (Swedish or English).
- **Pagination**: A mechanism for displaying large event lists in manageable segments with navigation controls.
- **Bulk_Selection**: A UI pattern allowing users to select multiple events for batch operations.
- **Section_Header**: A visual divider grouping events by date within a list.

## Requirements

### Requirement 1: Popup Interaction Enhancements

**User Story:** As a user, I want richer interaction capabilities directly in the popup, so that I can manage my starred events without navigating to the full stars page.

#### Acceptance Criteria

1. THE Popup_UI SHALL display an export button that generates and downloads an ICS file of all starred events.
2. THE Popup_UI SHALL display a filled star toggle for each event in the list, allowing the user to unstar events directly from the popup by clicking the star.
3. WHEN the user clicks the star toggle for a starred event in the Popup_UI, THE Popup_UI SHALL send an UNSTAR_EVENT message to the Background_Service_Worker and remove the event from the displayed list.
4. WHEN an event has a non-null sourceUrl, THE Popup_UI SHALL render the event title as a clickable link that opens the source page in a new tab.
5. WHEN an event title link is clicked in the Popup_UI, THE Extension SHALL open the sourceUrl in a new browser tab.
6. THE Popup_UI SHALL provide an expand/collapse toggle for each event item, revealing full details (description, topic, complete date/time range) when expanded.
7. WHEN the user expands an event item, THE Popup_UI SHALL display the event description, topic, and full start-to-end time range below the compact summary.
8. THE Popup_UI SHALL display a count indicator in the header showing the number of displayed events relative to the total (e.g., "20 av 47" in Swedish, "20 of 47" in English).
9. WHEN the total number of starred events exceeds the displayed count, THE Popup_UI SHALL provide a pagination or load-more mechanism to access additional events beyond the initial set.
10. THE Popup_UI SHALL NOT silently cap the event list without informing the user of hidden items.

---

### Requirement 2: Stars Page Usability Improvements

**User Story:** As a user, I want search, grouping, and batch operations on the stars page, so that I can efficiently manage a large collection of starred events.

#### Acceptance Criteria

1. THE Stars_Page SHALL provide a text filter input that filters the displayed events by matching against title, organiser, or topic fields as the user types.
2. WHEN the user enters text in the filter input, THE Stars_Page SHALL display only events where the title, organiser, or topic contains the filter text (case-insensitive).
3. THE Stars_Page SHALL group events by date, displaying a Section_Header for each day (e.g., "Måndag 22 juni" in Swedish, "Monday 22 June" in English).
4. WITHIN each date group, THE Stars_Page SHALL sort events by start time ascending.
5. THE Stars_Page SHALL provide a Bulk_Selection mechanism allowing the user to select multiple events via checkboxes.
6. WHEN one or more events are selected, THE Stars_Page SHALL display batch action controls for unstarring the selected events or exporting only the selected events as ICS.
7. THE Stars_Page SHALL replace the "Actions" column header with a contextually appropriate label or remove the header text entirely, since the column contains only a single remove action.

---

### Requirement 3: Visual Design and Branding

**User Story:** As a user, I want a visually polished and cohesive extension interface, so that the experience feels professional and trustworthy.

#### Acceptance Criteria

1. THE Extension SHALL use a cohesive color palette across all UI surfaces (Popup_UI, Stars_Page, Star_Button), moving beyond default Tailwind grays and blues.
2. THE Popup_UI SHALL use card-style event items with defined spacing, typography hierarchy, and visual separation between events.
3. THE Popup_UI SHALL display a branded header with the extension name and a recognizable visual identity element.
4. THE Stars_Page SHALL use zebra striping (alternating row backgrounds) for improved readability of the event grid.
5. THE Stars_Page SHALL display hover states on event rows for clear interactive affordance.
6. THE Stars_Page SHALL use a responsive layout that adapts gracefully to different window widths.
7. THE Extension icon SHALL be redesigned at all four sizes (16px, 32px, 48px, 128px) to be distinctive, recognizable at small sizes, and thematically appropriate for Almedalsveckan.
8. THE Extension icon SHALL NOT use the current placeholder geometric star.
9. WHEN the Star_Button transitions from unstarred to starred, THE Star_Button SHALL play a subtle scale or color animation to provide visual feedback.
10. BEFORE implementing visual design changes, THE development process SHALL present color palette options, icon design concepts, and layout mockups for human review and approval.
11. THE visual design implementation SHALL NOT proceed until the presented design direction has been explicitly approved.

---

### Requirement 4: Date and Time Formatting

**User Story:** As a user, I want dates and times displayed in a natural, readable format, so that I can quickly understand when events occur without parsing ISO timestamps.

#### Acceptance Criteria

1. THE Date_Formatter SHALL convert ISO 8601 date-time strings into locale-appropriate human-readable format.
2. WHEN the locale is Swedish, THE Date_Formatter SHALL format dates as "Mån 22 juni 07:30–08:30" (abbreviated day name, day number, month name, time range).
3. WHEN the locale is English, THE Date_Formatter SHALL format dates as "Mon 22 Jun 07:30–08:30" (abbreviated day name, day number, abbreviated month name, time range).
4. WHEN an event has both startDateTime and endDateTime on the same day, THE Date_Formatter SHALL display the time as a range (e.g., "07:30–08:30").
5. WHEN an event has only a startDateTime and no endDateTime, THE Date_Formatter SHALL display only the start time (e.g., "Mån 22 juni 07:30").
6. THE Popup_UI SHALL use the Date_Formatter for all event date-time display instead of raw ISO 8601 strings.
7. THE Stars_Page SHALL use the Date_Formatter for all event date-time display instead of raw ISO 8601 strings.
8. FOR ALL valid ISO 8601 date-time strings with timezone, formatting then extracting the date and time components SHALL produce values consistent with the original ISO string (round-trip consistency property).

---

### Requirement 5: Configurable Date Mapping

**User Story:** As a developer, I want year-specific date mappings extracted to a configuration module, so that the extension can be updated for each year's Almedalsveckan without modifying core logic.

#### Acceptance Criteria

1. THE Config_Module SHALL export the day-name-to-date mapping (e.g., "Måndag" → "2026-06-22") as a configurable constant rather than a hardcoded value in the Event_Normalizer.
2. THE Config_Module SHALL be the single source of truth for year-specific Almedalsveckan dates.
3. THE Event_Normalizer SHALL import the day-to-date mapping from the Config_Module instead of defining it inline.
4. WHEN a new year's dates are known, THE Config_Module SHALL be the only file requiring modification to update the date mapping.
5. THE Config_Module SHALL include a comment documenting the expected update cadence (annually, when Almedalsveckan dates are announced).

---

### Requirement 6: User Guidance and Language

**User Story:** As a new user, I want to understand what the extension does and how to use it, and as any user, I want to choose my display language manually.

#### Acceptance Criteria

1. WHEN the extension is installed or updated to a version containing the Onboarding_View for the first time, THE Extension SHALL display an introductory section explaining its purpose and basic usage.
2. THE Onboarding_View SHALL explain: what the extension does, how to star events on the programme page, how to access starred events, and how to export to calendar.
3. THE Onboarding_View SHALL be dismissible and SHALL NOT reappear automatically after the user dismisses it.
4. THE Extension SHALL provide a persistent help or "How it works" link (in the Popup_UI footer or settings area) that allows the user to re-open the Onboarding_View at any time after initial dismissal.
5. THE Extension SHALL provide a Language_Toggle control accessible from the Popup_UI or a settings area.
6. WHEN the user selects a language via the Language_Toggle, THE Extension SHALL persist the preference in storage.local and use it for all subsequent UI string retrieval, overriding the browser's language setting.
7. WHEN no manual language preference is stored, THE Extension SHALL continue to follow the browser's language setting as the default behavior.

---

### Requirement 7: Reliability and Feedback

**User Story:** As a user, I want clear feedback when actions succeed or fail, and a safety net for accidental removals, so that I can use the extension with confidence.

#### Acceptance Criteria

1. WHEN the user unstars an event (from Popup_UI or Stars_Page), THE Extension SHALL display an Undo_Toast for a minimum of 5 seconds offering to restore the event.
2. WHEN the user clicks the undo action within the Undo_Toast duration, THE Extension SHALL re-star the event with its original data and restore it to the displayed list.
3. WHEN the Undo_Toast duration expires without user interaction, THE Extension SHALL permanently remove the event from storage.
4. THE Extension SHALL display a Badge on the toolbar icon showing the current count of starred events.
5. WHEN the number of starred events changes, THE Extension SHALL update the Badge text to reflect the new count.
6. WHEN there are zero starred events, THE Extension SHALL clear the Badge (display no text).
7. IF the Star_Button click fails because the Background_Service_Worker is unavailable, THEN THE Star_Button SHALL display a brief visual error state (e.g., a red flash or error icon) indicating the action failed.
8. IF a message to the Background_Service_Worker fails, THEN THE Extension SHALL NOT leave the UI in an inconsistent state (the Star_Button SHALL revert to its previous visual state).

---

### Requirement 8: Conflict Detection

**User Story:** As a user planning my Almedalsveckan schedule, I want to clearly see when starred events overlap in time, so that I can resolve scheduling conflicts before they happen.

#### Acceptance Criteria

1. WHEN two or more starred events have overlapping time ranges, THE Extension SHALL visually distinguish those events as conflicting within the event list.
2. THE conflict visualization SHALL be visible in both the Popup_UI and the Stars_Page.
3. THE Extension SHALL determine overlap by comparing startDateTime and endDateTime: two events conflict when one starts before the other ends and ends after the other starts.
4. WHEN an event has no endDateTime, THE Extension SHALL treat it as a point-in-time event (zero duration) for conflict detection purposes.
5. THE conflict visualization SHALL clearly communicate which events conflict with each other, not merely that a conflict exists in isolation.
6. WHEN a conflicting event is unstarred, THE Extension SHALL recalculate conflicts and remove conflict visualization from events that no longer overlap.
7. BEFORE implementing conflict visualization, THE development process SHALL present visualization options (e.g., timeline view, colored grouping, connecting lines, side-by-side comparison) for human review and approval.
8. THE conflict visualization implementation SHALL NOT proceed until the presented approach has been explicitly approved.
