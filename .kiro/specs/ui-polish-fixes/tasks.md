# Tasks

## Requirement 1: Extension Toolbar Icon Uses PNG Icons

- [x] 1. Update manifest to reference PNG icon files
  - [x] 1.1 Update `src/extension/manifest/base.json` `action.default_icon` field to use `.png` extensions instead of `.svg`
  - [x] 1.2 Update `src/extension/manifest/base.json` top-level `icons` field to use `.png` extensions instead of `.svg`
  - [x] 1.3 Verify all four PNG files exist in `icons/` directory (icon-16.png, icon-32.png, icon-48.png, icon-128.png)
  - [x] 1.4 Write unit test in `tests/unit/extension/manifest.test.ts` verifying PNG references in both fields

## Requirement 5: Event Count Indicator Displays Correct Substitution

- [x] 2. Fix event count indicator placeholder substitution
  - [x] 2.1 Update `src/ui/popup/components/EventList.tsx` to replace `{count}` and `{total}` tokens in the `eventCountIndicator` message with actual numeric values
  - [x] 2.2 Ensure the count indicator is hidden when no events are starred (0 total)
  - [x] 2.3 Write property test `tests/property/count-indicator-substitution.property.test.ts` (Property 1: placeholder substitution produces no raw tokens)
  - [x] 2.4 Write unit test in `tests/unit/ui/popup/EventList.test.tsx` verifying correct substitution with sample count/total values

## Requirement 8: Expand/Collapse Chevron Is Adequately Sized and Clear

- [x] 3. Increase chevron size and improve direction indicator
  - [x] 3.1 Update `src/ui/popup/components/EventItem.tsx` chevron button to `w-8 h-8` (32×32px clickable area)
  - [x] 3.2 Update chevron SVG to `width="20" height="20"` (20×20px rendered size)
  - [x] 3.3 Replace right-pointing chevron with downward-pointing (▼) when collapsed and upward-pointing (▲) when expanded
  - [x] 3.4 Verify `title` attribute tooltip uses `showMore` / `showLess` i18n keys (already implemented)
  - [x] 3.5 Write unit test in `tests/unit/ui/popup/EventItem.test.tsx` verifying button dimensions, SVG size, and chevron direction per state

## Requirement 9: Long Titles Are Fully Accessible

- [x] 4. Ensure titles wrap in popup and have tooltips in stars grid
  - [x] 4.1 Verify `src/ui/popup/components/EventItem.tsx` title element uses `break-words` class and does NOT use `truncate` (already correct)
  - [x] 4.2 Verify `src/ui/stars/components/EventRow.tsx` title cell has `title` attribute set to `event.title` (already has `title={event.title}`)
  - [x] 4.3 Update `src/ui/stars/components/EventGrid.tsx` title column `<td>` to remove `truncate` class and allow text wrapping
  - [x] 4.4 Write unit test verifying title cell in EventRow has correct `title` attribute

## Requirement 10: Long Organiser Field Does Not Break Layout

- [x] 5. Clamp organiser in popup and ensure truncation with tooltip in stars grid
  - [x] 5.1 Verify `src/ui/popup/components/EventItem.tsx` organiser element has `line-clamp-2` class (already correct)
  - [x] 5.2 Verify `src/ui/stars/components/EventRow.tsx` organiser cell has `truncate` class and `title` attribute (already correct)
  - [x] 5.3 Update `src/ui/stars/components/EventRow.tsx` date-time cell to add `whitespace-nowrap` class
  - [x] 5.4 Write unit test verifying date-time cell has `whitespace-nowrap` class

## Requirement 11: Redundant Description Link Removed

- [x] 6. Strip sourceUrl from rendered description
  - [x] 6.1 Add a `stripSourceUrl(description: string, sourceUrl: string | null): string` utility function (inline in EventItem or as a small helper)
  - [x] 6.2 Update `src/ui/popup/components/EventItem.tsx` expanded description rendering to use `stripSourceUrl` before displaying
  - [x] 6.3 Write property test `tests/property/description-url-strip.property.test.ts` (Property 3: description URL stripping removes sourceUrl)
  - [x] 6.4 Write unit test in `tests/unit/ui/popup/EventItem.test.tsx` verifying description does not contain sourceUrl when present

## Requirement 12: Stars Page Uses Full Browser Width

- [x] 7. Remove max-width constraint from stars page
  - [x] 7.1 Update `src/ui/stars/App.tsx` header container to remove `max-w-7xl` class (keep `w-full` and padding)
  - [x] 7.2 Update `src/ui/stars/App.tsx` main container to remove `max-w-7xl` class (keep `w-full` and padding)
  - [x] 7.3 Verify table already has `w-full` class in `EventGrid.tsx`
  - [x] 7.4 Write unit test in `tests/unit/ui/stars/App.test.tsx` verifying no `max-w-7xl` class on content containers

## Requirement 13: Stars Page Fields Are Not Cut Off

- [x] 8. Fix grid column truncation and wrapping
  - [x] 8.1 Update `src/ui/stars/components/EventRow.tsx` title cell to remove `truncate` class and allow wrapping (keep `title` attribute)
  - [x] 8.2 Verify organiser cell retains `truncate` class and `title` attribute (already correct)
  - [x] 8.3 Verify date-time cell has `whitespace-nowrap` (done in task 5.3)
  - [x] 8.4 Verify location and topic cells retain `truncate` class and `title` attributes (already correct)
  - [x] 8.5 Extend property test `tests/property/grid-truncation.property.test.ts` to verify all text cells have correct `title` attributes (Property 2)

## Requirement 15: Stars Page Unstar Action Uses Trash Icon

- [x] 9. Replace text unstar button with trash icon
  - [x] 9.1 Update `src/ui/stars/components/EventRow.tsx` unstar button to render a trash/bin SVG icon instead of text
  - [x] 9.2 Add `aria-label` with `adapter.getMessage('unstarAction')` to the icon button
  - [x] 9.3 Set button to minimum `w-8 h-8` (32×32px) clickable area
  - [x] 9.4 Write unit test in `tests/unit/ui/stars/EventRow.test.tsx` verifying SVG icon, aria-label, and button size

## Requirement 16: Stars Page Has Improved Visual Design

- [x] 10. Apply Gotland Sunset palette styling to stars page
  - [x] 10.1 Update `src/ui/stars/App.tsx` page container background to `bg-brand-surface`
  - [x] 10.2 Update `src/ui/stars/components/EventRow.tsx` row classes to `odd:bg-white even:bg-brand-surface hover:bg-amber-100`
  - [x] 10.3 Update `src/ui/stars/components/EventGrid.tsx` header row to use `border-b-2 border-brand-secondary` and `text-brand-secondary font-semibold`
  - [x] 10.4 Write unit test verifying row alternation classes and header styling

## Requirements 7 & 17: Branded Header on Stars Page

- [x] 11. Add branded header to stars page
  - [x] 11.1 Update `src/ui/stars/App.tsx` to add a branded header with `bg-brand-secondary`, white bold title from `extensionName` i18n key, amber star icon, and `border-b-[3px] border-brand-primary`
  - [x] 11.2 Remove or repurpose the existing `<h1>` in the stars page header section
  - [x] 11.3 Write unit test in `tests/unit/ui/stars/App.test.tsx` verifying branded header presence, text content, and styling classes

## Verification of Already-Implemented Requirements

- [x] 12. Verify requirements that are already satisfied by existing code
  - [x] 12.1 Verify Requirement 2 (Onboarding Programme Link): `OnboardingView.tsx` already renders step 1 as `<a>` with correct href, `target="_blank"`, and `rel="noopener noreferrer"`
  - [x] 12.2 Verify Requirement 3 (Persistent Programme Link): `App.tsx` footer already has programme link with `goToProgramme` i18n key
  - [x] 12.3 Verify Requirement 4 (Language Toggle): `LanguageToggle.tsx` already has visible label, `for` attribute, and persists selection
  - [x] 12.4 Verify Requirement 6 (Sort Selector Label): `SortSelector.tsx` already has visible label and `for` attribute
  - [x] 12.5 Verify Requirement 7 Popup Header: `App.tsx` already has branded header with correct styling
  - [x] 12.6 Verify Requirement 14 (Stars Page Sort Label): Stars page uses shared `SortSelector` which already has visible label
  - [x] 12.7 Write smoke tests confirming these elements are present in rendered output

## Final Verification

- [x] 13. Run full test suite and verify no regressions
  - [x] 13.1 Run `pnpm test:unit` — all unit tests pass
  - [x] 13.2 Run `pnpm test:property` — all property tests pass (100+ iterations each)
  - [x] 13.3 Run `pnpm typecheck` — no type errors
  - [x] 13.4 Run `pnpm lint` — no lint errors
  - [x] 13.5 Run `pnpm build` — extension builds successfully with updated manifest
