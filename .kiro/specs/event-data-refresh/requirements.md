# Requirements Document

## Introduction

The Almedalsstjärnan extension snapshots event data into `chrome.storage.local` at the moment the user stars an event. This data is never refreshed, so if an event organiser updates the event on almedalsveckan.info (changes time, location, title, etc.), the extension displays stale information in the popup and stars page. This feature introduces a silent background refresh mechanism that detects changes to starred events when the content script processes visible event cards, compares normalized DOM data against stored data, and updates storage while preserving the original `starredAt` timestamp.

## Glossary

- **Content_Script**: The extension script injected into almedalsveckan.info programme pages that scans the DOM for event cards and injects star buttons.
- **Background_Worker**: The Manifest V3 service worker that handles all storage read/write operations via message passing.
- **Event_Card**: An `li` element on the programme page containing `.event-information` that represents a single event.
- **NormalizedEvent**: The canonical data shape extracted from an Event_Card, containing id, title, organiser, startDateTime, endDateTime, location, description, topic, sourceUrl, and icsDataUri.
- **StarredEvent**: A persisted NormalizedEvent extended with `starred: true` and a `starredAt` ISO 8601 timestamp.
- **Mutable_Fields**: The subset of NormalizedEvent fields that may change over time: title, organiser, startDateTime, endDateTime, location, description, topic, sourceUrl, icsDataUri.
- **UPDATE_STARRED_EVENT**: A new message command sent from Content_Script to Background_Worker requesting a field-level update of a starred event without resetting `starredAt`.

## Requirements

### Requirement 1: Detect Stale Starred Events on Page Load

**User Story:** As a user, I want the extension to automatically detect when a starred event's data has changed on the website, so that I always see current information without manual intervention.

#### Acceptance Criteria

1. WHEN an Event_Card is processed and the GET_STAR_STATE response indicates the event is currently starred, THE Content_Script SHALL re-normalize the Event_Card DOM data into a NormalizedEvent using the existing normalizeEvent function.
2. IF re-normalization of a starred Event_Card fails, THEN THE Content_Script SHALL log a warning and skip the refresh comparison for that event without affecting star button injection or other card processing.
3. WHEN a NormalizedEvent is obtained for a starred event, THE Content_Script SHALL compare each of the 9 Mutable_Field values (title, organiser, startDateTime, endDateTime, location, description, topic, sourceUrl, icsDataUri) against the corresponding stored value using the Comparison_Logic defined in Requirement 5.
4. WHEN at least one Mutable_Field differs between the normalized DOM data and the stored data, THE Content_Script SHALL send an UPDATE_STARRED_EVENT message to the Background_Worker containing the event id and the complete set of current Mutable_Fields.
5. WHEN all Mutable_Field values match the stored data, THE Content_Script SHALL skip sending an update message for that event.

### Requirement 2: Update Starred Event Data While Preserving starredAt

**User Story:** As a user, I want the original starred timestamp preserved when event details are refreshed, so that I can still see when I originally starred an event.

#### Acceptance Criteria

1. WHEN the Background_Worker receives an UPDATE_STARRED_EVENT message, THE Background_Worker SHALL overwrite only the Mutable_Fields of the matching StarredEvent in storage with the values from the message payload, leaving the `id`, `starred`, and `starredAt` fields unchanged.
2. WHEN the Background_Worker processes an UPDATE_STARRED_EVENT message, THE Background_Worker SHALL preserve the existing `starredAt` value unchanged so that the stored `starredAt` after the update is identical to the `starredAt` before the update.
3. WHEN the Background_Worker processes an UPDATE_STARRED_EVENT message, THE Background_Worker SHALL preserve the `starred: true` value unchanged.
4. IF the UPDATE_STARRED_EVENT message references an event id that is not currently starred, THEN THE Background_Worker SHALL return a success response with no data and without modifying storage.
5. WHEN the Background_Worker successfully updates a StarredEvent via UPDATE_STARRED_EVENT, THE Background_Worker SHALL return a success response with no data.

### Requirement 3: Message Protocol Extension

**User Story:** As a developer, I want a well-typed message command for partial event updates, so that the content script can request field-level updates without triggering a full star/unstar cycle.

#### Acceptance Criteria

1. THE Message_Protocol SHALL include an UPDATE_STARRED_EVENT command in the MessageCommand union type and a corresponding UpdateStarredEventPayload variant in the MessagePayload union type.
2. THE UPDATE_STARRED_EVENT payload SHALL contain the event id as an EventId property and all Mutable_Fields (title, organiser, startDateTime, endDateTime, location, description, topic, sourceUrl, icsDataUri) as required readonly properties.
3. THE Background_Worker SHALL serialize UPDATE_STARRED_EVENT storage writes through the existing storage mutex to prevent race conditions.
4. WHEN the UPDATE_STARRED_EVENT handler encounters a storage error, THE Background_Worker SHALL return a MessageResponseError with a non-empty error string indicating the nature of the storage failure.
5. WHEN the UPDATE_STARRED_EVENT handler completes successfully, THE Background_Worker SHALL return a MessageResponseSuccess with data of type void.

### Requirement 4: Retrieve Stored Data for Comparison

**User Story:** As a developer, I want the content script to obtain the stored event data for comparison, so that unnecessary writes are avoided when data has not changed.

#### Acceptance Criteria

1. WHEN the Content_Script sends a GET_STAR_STATE message for a starred event, THE Background_Worker SHALL return a response containing the boolean star state (true) and the stored Mutable_Fields for that event.
2. WHEN the Content_Script sends a GET_STAR_STATE message for an event that is not starred, THE Background_Worker SHALL return a response containing the boolean star state (false) and no Mutable_Fields payload.
3. THE Content_Script SHALL retrieve stored Mutable_Fields via the GET_STAR_STATE response before performing a field-by-field comparison, without requiring a separate round-trip message.
4. IF the GET_STAR_STATE message returns a failure response or the message send throws an error, THEN THE Content_Script SHALL log a warning to the console and skip the refresh comparison for that event without affecting star button injection or other card processing.

### Requirement 5: Comparison Logic

**User Story:** As a developer, I want a reliable field comparison function, so that only genuine data changes trigger storage writes.

#### Acceptance Criteria

1. THE Comparison_Logic SHALL normalize each Mutable_Field string value by trimming leading and trailing whitespace and then converting whitespace-only or empty strings to null before comparison.
2. THE Comparison_Logic SHALL compare each normalized Mutable_Field value using strict equality, treating two null values as equal.
3. IF at least one Mutable_Field differs after normalization, THEN THE Comparison_Logic SHALL return a result indicating changes were detected, including the list of field names that differ.
4. IF all Mutable_Field values are equal after normalization, THEN THE Comparison_Logic SHALL return a result indicating no changes were detected.
5. THE Comparison_Logic SHALL produce a no-changes result when comparing a NormalizedEvent against itself (idempotence property).
6. THE Comparison_Logic SHALL detect at least one difference when comparing two NormalizedEvent objects that differ in at least one Mutable_Field value after normalization (sensitivity property).

### Requirement 6: Non-Interference with Existing Behaviour

**User Story:** As a user, I want the refresh mechanism to work silently without disrupting the existing star/unstar flow or page performance.

#### Acceptance Criteria

1. THE Content_Script SHALL complete star button injection and initial state display before initiating any refresh comparison for a given Event_Card.
2. WHEN a refresh update fails due to a non-success message response or an adapter exception, THE Content_Script SHALL retain the current visual star state of the affected Event_Card unchanged and log a console warning.
3. THE Content_Script SHALL perform refresh comparisons asynchronously and SHALL NOT execute synchronous main-thread work exceeding 50 milliseconds per Event_Card during the refresh cycle.
4. THE refresh mechanism SHALL not send UPDATE_STARRED_EVENT messages for events that are not currently starred.
5. IF a star or unstar user action is in progress for a given Event_Card, THEN THE Content_Script SHALL skip or discard any pending refresh update for that event until the star/unstar operation completes.
