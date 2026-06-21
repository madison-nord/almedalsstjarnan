# Bugfix Requirements Document

## Introduction

This document covers two bugs found during manual testing of the Almedalsstjärnan browser extension:

1. **Stars Page grid layout breaks when event fields contain commas** — Organiser names (and potentially other fields) containing commas cause table rows to render incorrectly, with columns misaligned and content cut off. This is visible on the live almedalsveckan.info site where many organisers have comma-separated names (e.g., "Org A, Org B").

2. **Redundant source URL in exported ICS calendar events** — The ICS generator's `buildDescription` function appends a localized "Källa:/Source:" line with the event's `sourceUrl` to the DESCRIPTION field. This source URL duplicates information that should instead be represented as a proper ICS `URL` property, cluttering the calendar event description with a redundant link.

---

## Bug Analysis — Bug 1: Grid Layout Breaks with Commas in Fields

### Current Behavior (Defect)

1.1 WHEN an event's organiser name contains a comma (e.g., "Org A, Org B") THEN the system renders the Stars Page grid row with misaligned columns and content cut off

1.2 WHEN any text field (organiser, location, topic, title) in a Stars Page grid row contains long text with commas THEN the system allows the text to overflow its table cell, pushing adjacent columns out of alignment

1.3 WHEN the Stars Page grid renders events with comma-containing fields THEN the system displays the date-time column incorrectly (shifted or truncated)

### Expected Behavior (Correct)

2.1 WHEN an event's organiser name contains a comma (e.g., "Org A, Org B") THEN the system SHALL render the Stars Page grid row with all six columns properly aligned and no content cut off

2.2 WHEN any text field in a Stars Page grid row contains long text with commas THEN the system SHALL constrain the text within its table cell using overflow handling (truncation with ellipsis or word wrapping) so that adjacent columns remain properly aligned

2.3 WHEN the Stars Page grid renders events with comma-containing fields THEN the system SHALL display the date-time column correctly at its designated width

### Unchanged Behavior (Regression Prevention)

3.1 WHEN event fields contain short text without commas THEN the system SHALL CONTINUE TO render the Stars Page grid with all six columns properly aligned

3.2 WHEN the Stars Page grid renders events with null optional fields (organiser, location, topic) THEN the system SHALL CONTINUE TO render empty cells without layout issues

3.3 WHEN the user clicks the unstar action in the grid THEN the system SHALL CONTINUE TO remove the event from the displayed list

---

## Bug Analysis — Bug 2: Redundant Source URL in ICS Description

### Current Behavior (Defect)

1.4 WHEN an event has a non-null sourceUrl and the ICS is exported THEN the system includes the source URL both as a "Källa:/Source:" line in the DESCRIPTION field and as information that duplicates across ICS fields, resulting in redundant content in the calendar event

1.5 WHEN an event has a non-null sourceUrl and a non-null description THEN the system appends the localized source label and URL to the description text, cluttering the DESCRIPTION field with link information that belongs in a dedicated ICS property

### Expected Behavior (Correct)

2.4 WHEN an event has a non-null sourceUrl and the ICS is exported THEN the system SHALL include the source URL as a dedicated ICS `URL` property on the VEVENT and SHALL NOT include a "Källa:/Source:" line in the DESCRIPTION field

2.5 WHEN an event has a non-null sourceUrl and a non-null description THEN the system SHALL output the description text in the DESCRIPTION field without appending the source URL, and SHALL output the source URL as a separate ICS `URL` property

### Unchanged Behavior (Regression Prevention)

3.4 WHEN an event has a null sourceUrl THEN the system SHALL CONTINUE TO omit both the `URL` property and any source line from the DESCRIPTION field

3.5 WHEN an event has a non-null description and a null sourceUrl THEN the system SHALL CONTINUE TO include only the description text in the DESCRIPTION field

3.6 WHEN an event has a null description and a null sourceUrl THEN the system SHALL CONTINUE TO omit the DESCRIPTION field entirely from the VEVENT

3.7 WHEN the ICS is exported THEN the system SHALL CONTINUE TO produce valid RFC 5545 output with CRLF line endings and proper line folding

3.8 WHEN the ICS is exported THEN the system SHALL CONTINUE TO include all other VEVENT fields (UID, DTSTAMP, DTSTART, DTEND, SUMMARY, LOCATION, ORGANIZER) unchanged
