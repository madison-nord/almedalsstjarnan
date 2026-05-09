# Implementation Plan: Popup UX Improvements

## Overview

Four targeted UX improvements to the Almedalsstjärnan browser extension popup and stars page. Each top-level task is independently committable and follows TDD workflow. All changes are CSS/layout and minor component logic — no core logic, background script, or storage changes.

## Tasks

- [ ] 1. Remove inconsistent grid divider in EventRow
  - [ ] 1.1 Write property test for EventRow border removal
    - Create `tests/property/event-row-no-border.property.test.ts`
    - **Property 3: EventRow date/time column has no conditional border styling**
    - Generate arbitrary events with `isConflicting` true/false using fast-check
    - Assert the date/time `<td>` never contains `border-l` class variants
    - **Validates: Requirements 3.1, 3.2, 3.3**
  - [ ] 1.2 Write unit test for EventRow border removal
    - Create `tests/unit/stars/event-row-border.test.tsx`
    - Test that conflicting events render date/time td without `border-l-2 border-l-slate-300`
    - Test that non-conflicting events render date/time td without `border-l` classes
    - Test that conflict dot indicator still renders for conflicting events
    - _Requirements: 3.1, 3.2, 3.3_
  - [ ] 1.3 Remove conditional border-l from EventRow component
    - In `src/ui/stars/components/EventRow.tsx`, remove the conditional `border-l-2 border-l-slate-300` from the date/time `<td>` className
    - Keep the conflict dot indicator and tooltip unchanged
    - _Requirements: 3.1, 3.2, 3.3_
  - [ ] 1.4 Checkpoint — verify EventRow tests pass
    - Run `pnpm vitest --run tests/property/event-row-no-border.property.test.ts tests/unit/stars/event-row-border.test.tsx`
    - Ensure all tests pass, ask the user if questions arise.

- [ ] 2. Always-visible bulk actions in Stars Page
  - [ ] 2.1 Write property test for BulkActions render and button state
    - Create `tests/property/bulk-actions-always-visible.property.test.ts`
    - **Property 1: BulkActions always renders with correct button state**
    - Generate arbitrary `selectedCount` (0..totalCount) and `totalCount` (0..100)
    - Assert component always renders a non-null element
    - Assert "unstar selected" and "export selected" buttons are disabled iff `selectedCount === 0`
    - **Validates: Requirements 2.1, 2.2, 2.3**
  - [ ] 2.2 Write property test for BulkActions count display
    - Add to `tests/property/bulk-actions-always-visible.property.test.ts`
    - **Property 2: BulkActions always displays counts**
    - Generate arbitrary `selectedCount` and `totalCount`
    - Assert both numbers appear as visible text in the rendered output
    - **Validates: Requirements 2.4, 2.5**
  - [ ] 2.3 Write unit test for BulkActions disabled state
    - Create `tests/unit/stars/bulk-actions-disabled.test.tsx`
    - Test that component renders when `selectedCount === 0` (no longer returns null)
    - Test buttons have `disabled` attribute and `opacity-50 cursor-not-allowed` when `selectedCount === 0`
    - Test buttons are enabled and fully opaque when `selectedCount > 0`
    - Test "select all" button remains enabled when `selectedCount === 0`
    - Test count displays "0 / {totalCount}" when nothing selected
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [ ] 2.4 Implement always-visible BulkActions component
    - In `src/ui/stars/components/BulkActions.tsx`:
    - Remove the `if (selectedCount === 0) return null;` early return
    - Add `disabled` attribute to "unstar selected" and "export selected" buttons when `selectedCount === 0`
    - Add `opacity-50 cursor-not-allowed` classes to disabled buttons
    - Keep "select all / clear" button always enabled
    - Ensure count always displays `{selectedCount} / {totalCount}`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [ ] 2.5 Checkpoint — verify BulkActions tests pass
    - Run `pnpm vitest --run tests/property/bulk-actions-always-visible.property.test.ts tests/unit/stars/bulk-actions-disabled.test.tsx`
    - Ensure all tests pass, ask the user if questions arise.

- [ ] 3. Popup scroll containment and sticky footer
  - [ ] 3.1 Write unit test for popup layout classes
    - Create `tests/unit/popup/popup-layout.test.tsx`
    - Test root container has `h-[560px]`, `min-h-[560px]`, `overflow-hidden`, `flex flex-col`
    - Test footer has `flex-shrink-0` class
    - Test header has `flex-shrink-0` class
    - Test EventList area has `flex-1 overflow-hidden` wrapper
    - Test that loading state also uses `h-[560px]` and `min-h-[560px]`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - [ ] 3.2 Implement popup scroll containment
    - In `src/ui/popup/App.tsx`:
    - Change root container from `min-h-[480px]` to `h-[560px] min-h-[560px] overflow-hidden`
    - Add `flex-shrink-0` to the header element
    - Wrap EventList/EmptyState area in a `flex-1 overflow-hidden` container
    - Add `flex-shrink-0` to the footer element
    - Update loading state container to use `h-[560px] min-h-[560px]`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - [ ] 3.3 Checkpoint — verify popup layout tests pass
    - Run `pnpm vitest --run tests/unit/popup/popup-layout.test.tsx`
    - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Onboarding view as modal overlay
  - [ ] 4.1 Write unit tests for OnboardingView modal overlay
    - Create `tests/unit/popup/onboarding-modal.test.tsx`
    - Test overlay renders with `fixed inset-0 z-50` classes
    - Test overlay has `role="dialog"` and `aria-modal="true"` attributes
    - Test dismiss button closes the overlay (calls `onDismiss`)
    - Test Escape key closes the overlay
    - Test overlay contains `aria-labelledby="onboarding-title"`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - [ ] 4.2 Write unit tests for focus trapping
    - Add to `tests/unit/popup/onboarding-modal.test.tsx`
    - Test that focus moves to first focusable element on mount
    - Test Tab at last focusable element cycles to first
    - Test Shift+Tab at first focusable element cycles to last
    - Test focus returns to trigger element on dismiss
    - _Requirements: 4.6_
  - [ ] 4.3 Implement OnboardingView as modal overlay
    - In `src/ui/popup/components/OnboardingView.tsx`:
    - Wrap content in a fixed overlay: `fixed inset-0 z-50 flex items-center justify-center bg-black/40`
    - Add `role="dialog"`, `aria-modal="true"`, `aria-labelledby="onboarding-title"` to overlay
    - Implement focus trapping with `useEffect`:
      - On mount, capture focusable elements and focus the first one
      - On Tab at last element → focus first; on Shift+Tab at first → focus last
      - On Escape → call `onDismiss`
    - Accept optional `triggerRef` prop to restore focus on dismiss
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  - [ ] 4.4 Update App.tsx to pass trigger ref to OnboardingView
    - In `src/ui/popup/App.tsx`:
    - Add a `useRef` for the Help_Link button
    - Pass the ref to `OnboardingView` so focus can be restored on dismiss
    - Ensure OnboardingView renders as overlay both on first run and via Help_Link
    - _Requirements: 4.4, 4.5, 4.6_
  - [ ] 4.5 Checkpoint — verify onboarding modal tests pass
    - Run `pnpm vitest --run tests/unit/popup/onboarding-modal.test.tsx`
    - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Final checkpoint — run full test suite
  - Run `pnpm vitest --run` to verify all existing and new tests pass
  - Run `pnpm run lint` and `pnpm run typecheck` to verify no regressions
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Each top-level task (1–4) is independently committable — commit and push after each per git workflow rules.
- TDD workflow: write failing tests first (1.1/1.2, 2.1/2.2/2.3, 3.1, 4.1/4.2), then implement (1.3, 2.4, 3.2, 4.3/4.4).
- Property tests use fast-check with minimum 100 iterations.
- All styling uses Tailwind CSS classes — no inline styles.
- Focus trapping in OnboardingView ensures WCAG 2.1 AA keyboard accessibility.
- The conflict dot indicator in EventRow is preserved — only the border-l is removed.
