# Requirements Document

## Introduction

This spec addresses 17 visual and functional polish issues discovered after the UX enhancements were implemented for the Almedalsstjärnan Chrome extension. The issues span the Popup UI and the Stars Page, covering broken i18n substitution, non-functional controls, layout overflow problems, missing branding, and inadequate affordances for interactive elements.

## Glossary

- **Popup_UI**: The 360px-wide popup panel rendered when the user clicks the extension toolbar icon.
- **Stars_Page**: The full-page tab (`stars.html`) showing all starred events in a table grid.
- **Extension_Manifest**: The `manifest.json` file that declares icons, permissions, and metadata for the Chrome extension.
- **Event_Count_Indicator**: The text element above the event list in the Popup_UI showing how many events are displayed versus total (e.g., "3 av 12").
- **Language_Toggle**: The `<select>` dropdown allowing the user to switch between Swedish, English, or auto-detect.
- **Sort_Selector**: The `<select>` dropdown allowing the user to choose a sort order for events.
- **Expand_Chevron**: The small arrow button on each event card that toggles expanded/collapsed detail view.
- **Branded_Header**: The dark navy header bar displaying the "Almedalsstjärnan" name, star icon, and event count.
- **Programme_Link**: A clickable link/button that navigates the user to the Almedalsveckan official programme page.
- **Unstar_Action**: The interactive element in the Stars_Page grid that removes an event from the starred list.
- **Adapter**: The `IBrowserApiAdapter` interface used for all browser API access and i18n message retrieval.

## Requirements

### Requirement 1: Extension Toolbar Icon Uses PNG Icons

**User Story:** As a user, I want the extension toolbar icon to display the branded star icon, so that I can easily identify the extension in my browser toolbar.

#### Acceptance Criteria

1. THE Extension_Manifest SHALL reference PNG icon files (`icons/icon-16.png`, `icons/icon-32.png`, `icons/icon-48.png`, `icons/icon-128.png`) in the `action.default_icon` field.
2. THE Extension_Manifest SHALL reference PNG icon files in the top-level `icons` field.
3. WHEN Chrome renders the toolbar icon, THE Extension_Manifest SHALL provide valid PNG files at all four required sizes (16, 32, 48, 128 pixels).

### Requirement 2: Onboarding Programme Link Is Clickable

**User Story:** As a new user, I want the "Visit the Almedalsveckan programme" text in the onboarding to be a clickable link, so that I can navigate directly to the programme page.

#### Acceptance Criteria

1. THE Popup_UI SHALL render the onboarding step 1 text as an `<a>` element with `href` pointing to the Almedalsveckan programme URL.
2. WHEN the user clicks the onboarding programme link, THE Popup_UI SHALL open the programme page in a new browser tab with `target="_blank"` and `rel="noopener noreferrer"`.

### Requirement 3: Persistent Programme Navigation Link

**User Story:** As a user, I want a visible link/button in the popup to navigate to the Almedalsveckan programme page, so that I can open the programme from any page without needing to remember the URL.

#### Acceptance Criteria

1. THE Popup_UI SHALL display a Programme_Link in the footer area that is always visible regardless of the current page context.
2. WHEN the user clicks the Programme_Link, THE Popup_UI SHALL open the Almedalsveckan programme page in a new browser tab.
3. THE Programme_Link SHALL use localized text from the `goToProgramme` i18n message key.

### Requirement 4: Language Toggle Functional and Labelled

**User Story:** As a user, I want the language dropdown to work when I change it and to have a visible label, so that I can switch the extension language and understand what the dropdown controls.

#### Acceptance Criteria

1. WHEN the user selects a new language option in the Language_Toggle, THE Popup_UI SHALL persist the selection via the `SET_LANGUAGE_PREFERENCE` message and reload to apply the new locale.
2. THE Language_Toggle SHALL display a visible text label (from the `languageVisibleLabel` i18n key) immediately before the dropdown element.
3. THE Language_Toggle SHALL have an associated `<label>` element with a `for` attribute matching the dropdown's `id`.

### Requirement 5: Event Count Indicator Displays Correct Substitution

**User Story:** As a user, I want to see the correct count of displayed events (e.g., "3 av 12"), so that I know how many events are shown versus the total.

#### Acceptance Criteria

1. THE Popup_UI SHALL substitute the `{count}` and `{total}` placeholders in the `eventCountIndicator` i18n message with the actual displayed count and total count values.
2. WHEN no events are starred, THE Popup_UI SHALL hide the Event_Count_Indicator entirely.
3. THE Event_Count_Indicator SHALL display the fully substituted text (e.g., "3 av 12" in Swedish or "3 of 12" in English) with no raw placeholder tokens visible.

### Requirement 6: Sort Selector Has Visible Label

**User Story:** As a user, I want the sort dropdown to have a visible label, so that I understand what the dropdown controls.

#### Acceptance Criteria

1. THE Sort_Selector SHALL display a visible text label (from the `sortVisibleLabel` i18n key) immediately before the dropdown element.
2. THE Sort_Selector SHALL have an associated `<label>` element with a `for` attribute matching the dropdown's `id`.

### Requirement 7: Branded Header Displays Extension Name

**User Story:** As a user, I want to see the "Almedalsstjärnan" name prominently in the extension header, so that I know which extension I am using.

#### Acceptance Criteria

1. THE Popup_UI SHALL render a Branded_Header with a dark navy background (`#1e3a5f`) and a 3px amber (`#d97706`) bottom border.
2. THE Branded_Header SHALL display the text "Almedalsstjärnan" (from the `popupTitle` i18n key) in white, bold font.
3. THE Branded_Header SHALL display an amber star icon (`#f59e0b`) to the left of the title text.
4. THE Stars_Page SHALL render a Branded_Header with the same visual treatment as the Popup_UI header.
5. THE Stars_Page Branded_Header SHALL display the text "Almedalsstjärnan" (from the `extensionName` i18n key) in white, bold font.

### Requirement 8: Expand/Collapse Chevron Is Adequately Sized and Clear

**User Story:** As a user, I want the expand/collapse button on event cards to be large enough to see and click easily, so that I can discover and use the detail toggle.

#### Acceptance Criteria

1. THE Expand_Chevron SHALL have a minimum clickable area of 32×32 pixels.
2. THE Expand_Chevron SVG icon SHALL be at least 20×20 pixels in rendered size.
3. THE Expand_Chevron SHALL use a downward-pointing chevron (▼) when collapsed and an upward-pointing chevron (▲) when expanded, making the toggle direction obvious.
4. THE Expand_Chevron SHALL display a tooltip (via the `title` attribute) with localized text indicating "Show more" or "Show less".

### Requirement 9: Long Titles Are Fully Accessible

**User Story:** As a user, I want to be able to read the full title of an event even when it is long, so that I do not lose information to truncation.

#### Acceptance Criteria

1. WHEN an event title exceeds the available width in the Popup_UI, THE EventItem component SHALL wrap the title text to multiple lines instead of truncating.
2. WHEN an event title exceeds the available width in the Stars_Page grid, THE EventRow component SHALL display a `title` attribute tooltip containing the full title text.

### Requirement 10: Long Organiser Field Does Not Break Layout

**User Story:** As a user, I want the layout to remain stable when an organiser name is very long, so that other fields (especially date) remain readable.

#### Acceptance Criteria

1. WHEN an organiser field exceeds the available width in the Popup_UI, THE EventItem component SHALL clamp the organiser text to a maximum of 2 lines.
2. WHEN an organiser field exceeds the available column width in the Stars_Page grid, THE EventRow component SHALL truncate the text with an ellipsis and provide a `title` attribute tooltip with the full text.
3. THE Stars_Page grid date column SHALL use `white-space: nowrap` to prevent the date-time text from wrapping to multiple rows.

### Requirement 11: Redundant Description Link Removed

**User Story:** As a user, I want to avoid seeing a duplicate, non-clickable link in the expanded description area, so that the interface is clean and non-confusing.

#### Acceptance Criteria

1. THE EventItem expanded detail section SHALL NOT render a raw URL or non-clickable link text when the event already has a clickable title link.
2. IF the event description contains a URL matching the event's `sourceUrl`, THEN THE EventItem component SHALL strip that URL from the rendered description text.

### Requirement 12: Stars Page Uses Full Browser Width

**User Story:** As a user, I want the stars page table to use the full width of my browser window, so that I can see more information without horizontal scrolling.

#### Acceptance Criteria

1. THE Stars_Page main content container SHALL expand to the full viewport width (with appropriate horizontal padding).
2. THE Stars_Page table SHALL use `width: 100%` of its container.
3. THE Stars_Page SHALL NOT constrain the content to a narrow `max-width` that leaves unused space on wide screens.

### Requirement 13: Stars Page Fields Are Not Cut Off

**User Story:** As a user, I want to be able to read the full content of each field in the stars page, so that I do not lose important event information.

#### Acceptance Criteria

1. THE Stars_Page grid title column SHALL allow text to wrap to multiple lines instead of truncating with a hidden overflow.
2. THE Stars_Page grid organiser column SHALL truncate with ellipsis and provide a `title` tooltip with the full text.
3. THE Stars_Page grid date-time column SHALL use `white-space: nowrap` to prevent line breaks within the date string.
4. THE Stars_Page grid location and topic columns SHALL truncate with ellipsis and provide `title` tooltips with the full text.

### Requirement 14: Stars Page Sort Dropdown Has Visible Label

**User Story:** As a user, I want the sort dropdown on the stars page to have a visible label, so that I understand what the dropdown controls.

#### Acceptance Criteria

1. THE Stars_Page Sort_Selector SHALL display a visible text label (from the `sortVisibleLabel` i18n key) immediately before the dropdown element.

### Requirement 15: Stars Page Unstar Action Uses Trash Icon

**User Story:** As a user, I want the remove action in the stars page to use a recognizable trash/bin icon instead of text, so that the action is visually clear and compact.

#### Acceptance Criteria

1. THE Stars_Page Unstar_Action SHALL render a trash/bin SVG icon instead of the text "Remove"/"Ta bort".
2. THE Unstar_Action icon button SHALL have an `aria-label` with the localized unstar action text for screen reader accessibility.
3. THE Unstar_Action icon SHALL have a minimum clickable area of 32×32 pixels.

### Requirement 16: Stars Page Has Improved Visual Design

**User Story:** As a user, I want the stars page to have a polished, visually appealing design consistent with the Gotland Sunset palette, so that the experience feels cohesive and professional.

#### Acceptance Criteria

1. THE Stars_Page SHALL use the brand surface color (`#fffbeb`) as the page background.
2. THE Stars_Page table rows SHALL alternate between white and the brand surface color for visual rhythm.
3. THE Stars_Page table header row SHALL use a subtle bottom border and semi-bold text in the brand secondary color (`#1e3a5f`).
4. THE Stars_Page hover state on table rows SHALL use a warm highlight color (amber-100 or similar).

### Requirement 17: Stars Page Has Branded Header

**User Story:** As a user, I want the stars page to display the Almedalsstjärnan branded header, so that the page feels like part of the same extension experience as the popup.

#### Acceptance Criteria

1. THE Stars_Page SHALL render a Branded_Header at the top of the page with a dark navy background (`#1e3a5f`).
2. THE Stars_Page Branded_Header SHALL display an amber star icon and the "Almedalsstjärnan" name in white bold text.
3. THE Stars_Page Branded_Header SHALL have a 3px amber (`#d97706`) bottom border consistent with the Popup_UI header.
