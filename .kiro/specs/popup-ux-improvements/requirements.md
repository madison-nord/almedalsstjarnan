# Requirements Document

## Introduction

This feature addresses four UX issues in the Almedalsstjärnan browser extension that degrade usability of the popup and the full-list (stars) page. The improvements target scroll/layout behaviour in the popup, discoverability of bulk actions, visual consistency in the event grid, and visibility of the onboarding help view.

## Glossary

- **Popup**: The Chrome extension popup window (360px wide) rendered from `src/ui/popup/App.tsx`.
- **Stars_Page**: The full-page starred-events view rendered from `src/ui/stars/App.tsx`.
- **Event_List**: The scrollable list of starred events displayed in the Popup.
- **Footer**: The bottom section of the Popup containing the export button, programme link, full-list button, and help link.
- **BulkActions_Bar**: The toolbar in the Stars_Page providing "unstar selected" and "export selected" actions (`src/ui/stars/components/BulkActions.tsx`).
- **EventGrid**: The table component in the Stars_Page that renders starred events grouped by date (`src/ui/stars/components/EventGrid.tsx`).
- **EventRow**: A single row in the EventGrid representing one starred event (`src/ui/stars/components/EventRow.tsx`).
- **OnboardingView**: The introductory help section explaining extension usage (`src/ui/popup/components/OnboardingView.tsx`).
- **Help_Link**: The "How does it work" button in the Popup Footer that shows the OnboardingView.

## Requirements

### Requirement 1: Popup scroll containment and sticky footer

**User Story:** As a user, I want the popup footer to always be visible without scrolling, so that I can access export, programme link, full list, and help actions at any time regardless of how many events are starred.

#### Acceptance Criteria

1. THE Popup SHALL display the Footer in a fixed position at the bottom of the popup viewport, visible without scrolling.
2. THE Event_List SHALL be the only scrollable region within the Popup, contained between the header and the Footer.
3. WHEN the Event_List contains more events than fit in the available space, THE Event_List SHALL display a vertical scrollbar.
4. WHEN the Event_List contains fewer events than fit in the available space, THE Popup SHALL not display a scrollbar for the Event_List.
5. THE Popup SHALL have a minimum height of 560px.

### Requirement 2: Always-visible bulk actions in Stars Page

**User Story:** As a user, I want to see the bulk action options (unstar all, export all) at all times on the Stars Page, so that I know these features exist before selecting any events.

#### Acceptance Criteria

1. THE BulkActions_Bar SHALL be visible in the Stars_Page regardless of whether any events are selected.
2. WHILE no events are selected, THE BulkActions_Bar SHALL display the "unstar selected" and "export selected" buttons in a disabled state.
3. WHEN one or more events are selected, THE BulkActions_Bar SHALL enable the "unstar selected" and "export selected" buttons.
4. THE BulkActions_Bar SHALL display the current selection count and total count at all times.
5. WHILE no events are selected, THE BulkActions_Bar SHALL display a selection count of zero.

### Requirement 3: Remove inconsistent grid divider in EventGrid

**User Story:** As a user, I want a visually consistent event grid without unexpected vertical lines between columns, so that the interface looks polished and intentional.

#### Acceptance Criteria

1. THE EventRow SHALL NOT render a left border on the date/time column regardless of conflict state.
2. WHEN an event has a time conflict, THE EventRow SHALL indicate the conflict using only the conflict dot indicator and tooltip, without a column border.
3. FOR ALL events in the EventGrid, THE EventRow SHALL apply identical column border styling regardless of whether the event is conflicting.

### Requirement 4: Onboarding view visibility on help link activation

**User Story:** As a user, I want the onboarding help content to be clearly visible when I click "How does it work", so that I can always see the instructions regardless of my current scroll position.

#### Acceptance Criteria

1. WHEN the user activates the Help_Link, THE OnboardingView SHALL be displayed as a modal overlay above the Popup content.
2. THE OnboardingView overlay SHALL be visible regardless of the current scroll position of the Event_List.
3. THE OnboardingView overlay SHALL include a dismiss button that closes the overlay.
4. WHEN the OnboardingView overlay is dismissed, THE Popup SHALL return to its previous state with the Event_List visible.
5. WHEN the OnboardingView is shown on first run (not via Help_Link), THE OnboardingView SHALL also display as a modal overlay.
6. THE OnboardingView overlay SHALL be keyboard-accessible, with focus trapped within the overlay while it is open.
