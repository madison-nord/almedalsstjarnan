# Requirements Document

## Introduction

The Almedalsstjärnan extension currently provides a minimal onboarding modal with four one-liner steps and a "How does it work?" link in the popup footer. This content fails to communicate the extension's full feature set — sorting options, conflict detection, the dedicated stars page, search/filter, bulk actions, ICS calendar export details, and the language toggle are all undiscoverable. This feature replaces the current onboarding with a richer, single-view quick-reference help overlay that provides a scannable summary of all key features grouped by topic. Each feature group includes a concise description and a visual icon. The help content is bilingual (Swedish/English) via the existing i18n system, dismissible, and re-accessible at any time from both the popup and the stars page.

## Glossary

- **Help_Modal**: A dismissible modal overlay that presents a scrollable quick-reference view of all extension features, organized into feature groups with icons and descriptions.
- **Feature_Group**: A section within the Help_Modal covering one capability, consisting of a visual icon, a heading, and a short description.
- **Help_Trigger**: A button or link element that opens the Help_Modal, present in both the popup footer and the stars page.
- **Popup**: The 360×600px fixed-size popup UI shown when the extension icon is clicked.
- **Stars_Page**: The full-width responsive page (`stars.html`) displaying all starred events in a grid with sorting, filtering, and bulk actions.
- **Adapter**: The `IBrowserApiAdapter` interface used for message passing, storage access, and i18n string retrieval via `getMessage()`.

## Requirements

### Requirement 1: Quick-Reference Help Content Structure

**User Story:** As a user, I want a single scrollable help view that summarises all extension features at a glance, so that I can quickly find and understand capabilities without clicking through multiple steps.

#### Acceptance Criteria

1. WHEN the Help_Modal is opened, THE Help_Modal SHALL display all Feature_Groups in a single scrollable view without requiring step-by-step navigation.
2. THE Help_Modal SHALL include Feature_Groups covering at minimum the following topics in this fixed display order: starring events on the programme page, viewing starred events in the popup, the dedicated Stars_Page with full list view, sorting options, conflict detection (time overlap warnings), search and filter on the Stars_Page, bulk actions, ICS calendar export (and what it means), and the language toggle.
3. WHEN a Feature_Group is displayed, THE Help_Modal SHALL show a visual icon, a heading of no more than 40 characters, and a descriptive text of one to three sentences for that group.
4. THE Help_Modal SHALL display a title heading at the top of the content area.
5. THE Help_Modal SHALL display a dismiss button positioned at the top-right corner of the modal content area to close the modal.

### Requirement 2: First-Run Onboarding Behaviour

**User Story:** As a new user, I want the help reference to appear automatically on first use, so that I immediately learn what the extension can do.

#### Acceptance Criteria

1. WHEN the popup is opened and the onboarding dismissed state is not set in storage, THE Popup SHALL display the Help_Modal as a modal overlay that prevents interaction with underlying popup content until dismissed.
2. WHEN the user dismisses the Help_Modal during first-run onboarding, THE Popup SHALL immediately hide the Help_Modal and persist the dismissal state via the existing SET_ONBOARDING_STATE message command so the modal does not reappear on subsequent opens.
3. WHEN the popup is opened and the onboarding dismissed state is already set in storage, THE Popup SHALL NOT display the Help_Modal automatically.
4. IF the GET_ONBOARDING_STATE message fails, THEN THE Popup SHALL default to displaying the Help_Modal.
5. IF the SET_ONBOARDING_STATE message fails after the user dismisses the Help_Modal, THEN THE Popup SHALL still hide the Help_Modal for the current session but the modal may reappear on the next popup open.
6. WHEN the user activates the help link after onboarding has been dismissed, THE Popup SHALL display the Help_Modal without altering the persisted dismissal state.

### Requirement 3: Help Trigger from Popup

**User Story:** As a returning user, I want to re-open the help reference from the popup at any time, so that I can look up feature details when needed.

#### Acceptance Criteria

1. THE Popup SHALL display a Help_Trigger in the footer area that opens the Help_Modal when activated.
2. WHEN the Help_Trigger in the popup is activated, THE Help_Modal SHALL open and display all Feature_Groups.
3. THE Help_Trigger in the popup SHALL display localized text retrieved via `adapter.getMessage()`.

### Requirement 4: Help Trigger from Stars Page

**User Story:** As a user on the stars page, I want to access the help reference without returning to the popup, so that I can understand stars page features in context.

#### Acceptance Criteria

1. THE Stars_Page SHALL display a Help_Trigger that opens the Help_Modal when activated.
2. WHEN the Help_Trigger on the Stars_Page is activated, THE Help_Modal SHALL open and display all Feature_Groups.
3. THE Help_Trigger on the Stars_Page SHALL display localized text retrieved via `adapter.getMessage()`.
4. THE Help_Trigger on the Stars_Page SHALL be visually consistent with the page's existing header UI style.

### Requirement 5: Modal Accessibility and Focus Management

**User Story:** As a keyboard or assistive technology user, I want the help modal to be fully accessible, so that I can navigate and dismiss it without a mouse.

#### Acceptance Criteria

1. WHEN the Help_Modal is opened, THE Help_Modal SHALL trap keyboard focus within the modal so that Tab and Shift+Tab cycle only through focusable elements inside the modal, and background content SHALL be inert (not reachable via Tab or assistive technology navigation).
2. WHEN the Help_Modal is opened, THE Help_Modal SHALL move focus to the dismiss button as the initial focus target.
3. WHEN the user presses the Escape key while the Help_Modal is open, THE Help_Modal SHALL close.
4. WHEN the Help_Modal is closed, THE Help_Modal SHALL return focus to the Help_Trigger element that opened it.
5. THE Help_Modal SHALL use `role="dialog"` and `aria-modal="true"` attributes on the overlay container.
6. THE Help_Modal SHALL use `aria-labelledby` referencing the modal title heading.
7. THE dismiss button and Help_Trigger elements SHALL be keyboard-activatable via Enter and Space keys.
8. WHILE the Help_Modal is open, THE Help_Modal SHALL display a visible focus indicator on the currently focused element that meets WCAG 2.1 AA requirements (minimum 3:1 contrast ratio against adjacent colors).

### Requirement 6: Dismissibility and Non-Intrusiveness

**User Story:** As a user, I want the help modal to be easy to dismiss and not block my workflow, so that I can get to my starred events quickly.

#### Acceptance Criteria

1. WHEN the user clicks the dismiss button, THE Help_Modal SHALL close immediately.
2. WHEN the user clicks the backdrop overlay outside the modal content, THE Help_Modal SHALL close.
3. WHEN the Help_Modal is closed, THE Popup or Stars_Page SHALL restore the underlying UI to its previous interactive state.
4. THE Help_Modal SHALL NOT prevent interaction with underlying page elements once dismissed.
5. WHILE the Help_Modal is open, THE Help_Modal SHALL render a semi-transparent backdrop that visually separates the modal from the underlying content.

### Requirement 7: Bilingual Content via i18n

**User Story:** As a Swedish or English-speaking user, I want the help content displayed in my preferred language, so that I can understand the feature descriptions clearly.

#### Acceptance Criteria

1. THE Help_Modal SHALL retrieve all user-facing text (modal title, Feature_Group headings, Feature_Group descriptions, dismiss button label) via `adapter.getMessage()` using keys defined in the i18n message catalogs, with a minimum of one key for the modal title, one key per Feature_Group heading, one key per Feature_Group description, and one key for the dismiss button label.
2. THE i18n message catalogs SHALL include Swedish translations for all Help_Modal text keys in `_locales/sv/messages.json`, with each entry containing a non-empty `message` field and a `description` field.
3. THE i18n message catalogs SHALL include English translations for all Help_Modal text keys in `_locales/en/messages.json`, with each entry containing a non-empty `message` field and a `description` field.
4. WHEN the user changes the language preference via the language toggle while the Help_Modal is open, THE Help_Modal SHALL re-render its text content in the newly selected language without requiring the modal to be closed and reopened.
5. WHEN no language preference is set, THE Help_Modal SHALL display text in the browser's default locale, falling back to Swedish if the browser locale is neither Swedish nor English.
6. IF a message key returns an empty string (key not found in the active locale catalog), THEN THE Help_Modal SHALL display the Swedish translation for that key as a fallback.

### Requirement 8: Visual Feature Icons

**User Story:** As a user, I want each feature group to include a visual icon, so that I can quickly scan the help content and identify relevant features.

#### Acceptance Criteria

1. WHEN a Feature_Group is displayed, THE Help_Modal SHALL render a visual icon (inline SVG) relevant to that feature topic alongside the heading and description.
2. THE visual icons SHALL use `aria-hidden="true"` since they are decorative and the feature is described in the accompanying text.
3. THE visual icons SHALL be inline SVG or Tailwind-styled elements (not external image files) to avoid additional network requests.
4. THE visual icons SHALL meet WCAG 2.1 AA contrast requirements (minimum 3:1 ratio) against the modal background.

### Requirement 9: Responsive Layout

**User Story:** As a user, I want the help modal to render correctly in both the narrow popup and the full-width stars page, so that content is readable in both contexts.

#### Acceptance Criteria

1. WHILE displayed within the Popup (360×600px viewport), THE Help_Modal SHALL constrain its width and height to fit within the popup boundaries without horizontal scrolling, leaving at least 8px of visible margin on each side.
2. WHILE displayed within the Stars_Page, THE Help_Modal SHALL center itself within the viewport and limit its maximum width to 640px.
3. WHILE the help content exceeds the available modal height, THE Help_Modal SHALL allow vertical scrolling within the modal content area.
4. THE Help_Modal SHALL use Tailwind CSS utility classes for all styling.
5. WHILE displayed within the Popup, THE Help_Modal SHALL arrange Feature_Groups in a single-column layout.
6. WHILE displayed within the Stars_Page at a viewport width of 768px or greater, THE Help_Modal SHALL arrange Feature_Groups in a two-column grid layout.

