# Implementation Plan: User Help Onboarding

## Overview

Replace the existing minimal `OnboardingView` modal with a comprehensive, data-driven `HelpModal` shared component that displays 9 feature groups with inline SVG icons and bilingual content. The modal is integrated in both the popup (single-column) and stars page (two-column grid at ≥768px), with full keyboard accessibility, focus trapping, and responsive layout.

## Tasks

- [x] 1. Add i18n message keys for help modal content
  - [x] 1.1 Add 20 new message keys to `_locales/sv/messages.json`
    - Add keys: `helpModalTitle`, `helpModalDismiss`, and 9 pairs of `helpGroup{Name}Heading` / `helpGroup{Name}Desc`
    - Each entry must have non-empty `message` and `description` fields
    - Swedish text should be concise: headings ≤40 characters, descriptions 1–3 sentences
    - _Requirements: 7.1, 7.2, 1.3_

  - [x] 1.2 Add 20 new message keys to `_locales/en/messages.json`
    - Mirror all keys from `_locales/sv/messages.json` with English translations
    - Each entry must have non-empty `message` and `description` fields
    - English headings must also be ≤40 characters
    - _Requirements: 7.1, 7.3, 1.3_

- [x] 2. Create feature groups data structure and icon components
  - [x] 2.1 Create `src/ui/shared/help-feature-groups.ts`
    - Define `HelpFeatureGroup` interface with `headingKey`, `descriptionKey`, and `Icon` fields
    - Export `HELP_FEATURE_GROUPS` as a `readonly` array of 9 groups in fixed display order
    - Groups: Star Events, Popup View, Stars Page, Sorting, Conflict Detection, Search & Filter, Bulk Actions, ICS Export, Language Toggle
    - Each `Icon` is a functional component rendering inline SVG with `aria-hidden="true"`, 24×24 viewBox, `w-6 h-6` Tailwind classes, `currentColor` fill
    - _Requirements: 1.2, 1.3, 8.1, 8.2, 8.3_

- [x] 3. Implement HelpModal shared component
  - [x] 3.1 Create `src/ui/shared/HelpModal.tsx`
    - Implement `HelpModalProps` interface: `adapter`, `onDismiss`, `triggerRef?`, `layoutMode`
    - Render full-screen semi-transparent backdrop (`bg-black/40`)
    - Render centered modal content with `role="dialog"`, `aria-modal="true"`, `aria-labelledby` referencing title
    - Render dismiss button at top-right corner of modal content area
    - Iterate over `HELP_FEATURE_GROUPS` and render icon, heading, and description for each group using `adapter.getMessage()`
    - Apply single-column layout for `layoutMode='popup'`, two-column grid (`md:grid-cols-2`) for `layoutMode='page'`
    - Constrain width/height for popup context (fit within 360×600px with 8px margin), max-width 640px for page context
    - Allow vertical scrolling when content overflows modal height
    - Use Tailwind CSS utility classes for all styling
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.5, 5.6, 6.5, 8.1, 8.4, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [x] 3.2 Implement focus trapping and keyboard interaction in `HelpModal.tsx`
    - On mount, move focus to dismiss button
    - Trap Tab/Shift+Tab within modal (cycle through focusable elements only)
    - Close modal on Escape key press
    - Return focus to `triggerRef` element on close
    - Ensure background content is inert (not reachable via Tab)
    - Dismiss button and trigger must be activatable via Enter and Space
    - Visible focus indicator meeting WCAG 2.1 AA (minimum 3:1 contrast)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.7, 5.8_

  - [x] 3.3 Implement backdrop dismiss behaviour in `HelpModal.tsx`
    - Close modal when user clicks backdrop overlay outside modal content
    - Ensure clicks inside modal content do NOT trigger dismiss
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 4. Integrate HelpModal into Popup App
  - [x] 4.1 Replace `OnboardingView` with `HelpModal` in `src/ui/popup/App.tsx`
    - Replace `<OnboardingView>` render with `<HelpModal layoutMode="popup">`
    - Keep existing `showOnboarding` state, `handleDismissOnboarding`, `handleShowOnboarding` logic
    - Keep existing `helpLinkRef` for focus return
    - Pass `adapter={localizedAdapter}`, `onDismiss={handleDismissOnboarding}`, `triggerRef={helpLinkRef}`, `layoutMode="popup"`
    - Ensure first-run behaviour: show modal when `onboardingDismissed` is not set, hide after dismiss
    - Ensure help link re-opens modal without altering persisted dismissal state
    - Update import statements (remove `OnboardingView`, add `HelpModal`)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3_

- [x] 5. Integrate HelpModal into Stars Page App
  - [x] 5.1 Add help trigger and HelpModal to `src/ui/stars/App.tsx`
    - Add `showHelp` state and `helpTriggerRef`
    - Add help trigger button in header area (localized text via `adapter.getMessage()`)
    - Style help trigger consistently with existing header UI
    - Render `<HelpModal layoutMode="page">` conditionally when `showHelp` is true
    - Pass `adapter={localizedAdapter}`, `onDismiss` (sets `showHelp` to false), `triggerRef={helpTriggerRef}`, `layoutMode="page"`
    - No onboarding-dismissed logic on stars page (help is opt-in only)
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 6. Remove old OnboardingView component
  - [x] 6.1 Delete `src/ui/popup/components/OnboardingView.tsx`
    - Remove the file entirely
    - Verify no remaining imports reference `OnboardingView`
    - _Requirements: (cleanup — replaced by HelpModal)_

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Write unit tests for HelpModal and integrations
  - [x] 8.1 Write unit tests for HelpModal component in `tests/unit/shared/help-modal.test.tsx`
    - Test all 9 feature groups render with icon, heading, and description
    - Test accessibility attributes: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
    - Test initial focus on dismiss button
    - Test Escape key closes modal (calls `onDismiss`)
    - Test Enter/Space on dismiss button closes modal
    - Test backdrop click triggers `onDismiss`
    - Test clicks inside modal content do NOT trigger `onDismiss`
    - Test `layoutMode='popup'` uses single-column layout classes
    - Test `layoutMode='page'` uses two-column grid classes
    - Test focus return to triggerRef on close
    - _Requirements: 1.1, 1.2, 1.3, 5.1, 5.2, 5.3, 5.5, 5.6, 6.1, 6.2, 9.5, 9.6_

  - [x] 8.2 Write unit tests for popup App integration in `tests/unit/popup/app-help-modal.test.tsx`
    - Test onboarding shows on first run (GET_ONBOARDING_STATE returns false/not dismissed)
    - Test onboarding does NOT show when already dismissed
    - Test GET_ONBOARDING_STATE failure defaults to showing modal
    - Test dismiss persists state via SET_ONBOARDING_STATE
    - Test SET_ONBOARDING_STATE failure still hides modal for current session
    - Test help link re-opens modal without altering persisted state
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 8.3 Write unit tests for stars App integration in `tests/unit/stars/app-help-modal.test.tsx`
    - Test help trigger button is visible in header
    - Test clicking help trigger opens HelpModal
    - Test dismissing HelpModal closes it and returns focus to trigger
    - Test help trigger displays localized text
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 9. Write property-based tests for correctness properties
  - [x] 9.1 Write property test for i18n completeness in `tests/property/help-i18n-completeness.property.test.ts`
    - **Property 1: i18n Completeness**
    - For all 20 Help_Modal message keys × 2 locales, assert non-empty `message` and non-empty `description` in catalog
    - Import locale JSON files directly and verify each key exists with non-empty fields
    - **Validates: Requirements 7.1, 7.2, 7.3**

  - [x] 9.2 Write property test for heading length constraint in `tests/property/help-heading-length.property.test.ts`
    - **Property 2: Heading Length Constraint**
    - For each feature group in `HELP_FEATURE_GROUPS` × each locale (`sv`, `en`), assert resolved heading ≤ 40 characters
    - Use `getLocalizedMessage` to resolve headings
    - **Validates: Requirements 1.3**

  - [x] 9.3 Write property test for focus trapping in `tests/property/help-focus-trapping.property.test.ts`
    - **Property 3: Focus Trapping Invariant**
    - For random number of Tab presses (1–100), assert `document.activeElement` stays within modal container
    - Render HelpModal with Testing Library, simulate Tab key sequences
    - **Validates: Requirements 5.1**

  - [x] 9.4 Write property test for icon accessibility in `tests/property/help-icon-accessibility.property.test.ts`
    - **Property 4: Decorative Icon Accessibility**
    - For each SVG icon rendered within HelpModal, assert `aria-hidden="true"` attribute present
    - Render HelpModal and query all SVG elements
    - **Validates: Requirements 8.2**

- [x] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks are mandatory
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The existing `OnboardingView` focus trapping pattern is reused in `HelpModal`
- Implementation language: TypeScript with React (matching existing codebase)
- All styling via Tailwind CSS utility classes
- Icons are inline SVG functional components (no external image files)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["3.1"] },
    { "id": 3, "tasks": ["3.2", "3.3"] },
    { "id": 4, "tasks": ["4.1", "5.1"] },
    { "id": 5, "tasks": ["6.1"] },
    { "id": 6, "tasks": ["8.1", "8.2", "8.3"] },
    { "id": 7, "tasks": ["9.1", "9.2", "9.3", "9.4"] }
  ]
}
```
