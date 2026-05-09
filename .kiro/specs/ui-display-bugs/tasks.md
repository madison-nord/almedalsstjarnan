# Implementation Plan

- [ ] 1. Write bug condition exploration test for stripSourceUrl link label bug
  - **Property 1: Bug Condition** - Empty "Länk till evenemanget:" Label Residual
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the residual label bug
  - **Scoped PBT Approach**: Generate descriptions containing `"Länk till evenemanget: {URL}"` where URL matches sourceUrl; assert the stripped result contains neither the label text `"Länk till evenemanget:"` nor the URL
  - Test file: `tests/property/link-label-strip-bug-condition.property.test.ts`
  - Use fast-check with `numRuns: 100`
  - Custom arbitrary: generate `{ description: "{prefix}\nLänk till evenemanget: {sourceUrl}", sourceUrl }` with random prefix text and realistic URLs
  - Assert: `stripSourceUrl(description, sourceUrl)` does NOT contain `"Länk till evenemanget:"` AND does NOT contain `sourceUrl`
  - Bug condition from design: `isBugCondition_LinkLabel(input) = input.sourceUrl IS NOT NULL AND input.description CONTAINS ("Länk till evenemanget: " + input.sourceUrl)`
  - Expected behavior from design: result contains neither the label nor the URL
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct — it proves the bug exists because current code only strips the URL, leaving the label)
  - Document counterexamples found (e.g., `stripSourceUrl("Info\nLänk till evenemanget: https://x.com", "https://x.com")` returns `"Info\nLänk till evenemanget:"`)
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.2, 2.2_

- [ ] 2. Write preservation property tests for stripSourceUrl (BEFORE implementing fix)
  - **Property 2: Preservation** - Descriptions Without Link Label Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Test file: `tests/property/link-label-strip-preservation.property.test.ts`
  - Use fast-check with `numRuns: 100`
  - Observe: `stripSourceUrl("Workshop om AI\nhttps://example.com", "https://example.com")` returns `"Workshop om AI"` on unfixed code (bare URL stripped)
  - Observe: `stripSourceUrl("No URL here", null)` returns `"No URL here"` on unfixed code (null sourceUrl unchanged)
  - Observe: `stripSourceUrl("Text without the url", "https://other.com")` returns `"Text without the url"` on unfixed code (URL not in description unchanged)
  - Write property-based tests:
    - For all descriptions containing a bare sourceUrl (WITHOUT "Länk till evenemanget:" prefix), result equals `description.replace(sourceUrl, '').trim()` — same as current behavior
    - For all descriptions where sourceUrl is null, result equals description unchanged
    - For all descriptions where sourceUrl is not found in description, result equals description unchanged
  - Preservation condition: `NOT isBugCondition_LinkLabel(input)` — descriptions that do NOT contain the label+URL pattern
  - Verify tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.2_

- [ ] 3. Fix for empty "Länk till evenemanget:" label residual

  - [ ] 3.1 Implement the stripSourceUrl regex fix
    - File: `src/ui/popup/components/EventItem.tsx`, function `stripSourceUrl`
    - Replace the simple `description.replace(sourceUrl, '').trim()` with a two-step approach:
      1. First try to match and remove the full pattern `\n?Länk till evenemanget:\s*{escapedSourceUrl}` using a regex
      2. Fallback: if sourceUrl is still present after label removal, remove the bare URL
    - Add a helper `escapeRegExp(str)` to safely escape special regex characters in the URL
    - Return `result.trim()` to clean up any trailing whitespace
    - _Bug_Condition: isBugCondition_LinkLabel(input) where description contains "Länk till evenemanget: " + sourceUrl_
    - _Expected_Behavior: result does NOT contain "Länk till evenemanget:" AND does NOT contain sourceUrl_
    - _Preservation: descriptions without the label pattern produce identical output to the original function_
    - _Requirements: 1.2, 2.2, 3.2_

  - [ ] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Empty "Länk till evenemanget:" Label Residual
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 encodes the expected behavior (no residual label, no URL in output)
    - Run: `pnpm vitest --run tests/property/link-label-strip-bug-condition.property.test.ts`
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.2_

  - [ ] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Descriptions Without Link Label Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run: `pnpm vitest --run tests/property/link-label-strip-preservation.property.test.ts`
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions for non-buggy descriptions)
    - Confirm all preservation tests still pass after fix
    - _Requirements: 3.2_

- [ ] 4. Fix for language toggle closing popup on reload

  - [ ] 4.1 Write unit test for handleLocaleChange (TDD — test first)
    - Test file: `tests/unit/popup/language-toggle-no-reload.test.ts`
    - Test that `handleLocaleChange` does NOT call `window.location.reload()`
    - Test that changing locale triggers a React re-render with new locale state
    - Test that the popup App component re-renders children with updated locale key
    - Mock `window.location.reload` and assert it is never called
    - Run test on UNFIXED code — expect FAILURE
    - _Requirements: 1.3, 2.3_

  - [ ] 4.2 Implement the locale re-render fix
    - File: `src/ui/popup/App.tsx`
    - Add `locale` state (type `'sv' | 'en' | null`) initialized from `GET_LANGUAGE_PREFERENCE` on mount
    - Update `handleLocaleChange` to set locale state instead of calling `window.location.reload()`
    - Add a `key={locale ?? 'auto'}` prop on the main content wrapper to force React remount when locale changes, causing children to re-fetch i18n strings from the adapter
    - Remove the `window.location.reload()` call entirely
    - _Bug_Condition: locale change in Chrome extension popup triggers window.location.reload()_
    - _Expected_Behavior: UI re-renders with new locale strings without popup closing_
    - _Preservation: language preference still persisted via SET_LANGUAGE_PREFERENCE_
    - _Requirements: 1.3, 2.3, 3.3, 3.5, 3.6_

  - [ ] 4.3 Remove reload hint from LanguageToggle
    - File: `src/ui/shared/LanguageToggle.tsx`
    - Remove the `changed` state and the `{changed && <span>...reloadPopupHint...</span>}` JSX since reload is no longer needed
    - The `onLocaleChange` callback already notifies the parent — no other changes needed
    - _Requirements: 2.3_

  - [ ] 4.4 Verify unit test passes
    - Run: `pnpm vitest --run tests/unit/popup/language-toggle-no-reload.test.ts`
    - **EXPECTED OUTCOME**: Test PASSES (confirms locale change works without reload)
    - _Requirements: 2.3_

- [ ] 5. Fix for sort label barely visible on dark header

  - [ ] 5.1 Write unit test for SortSelector labelClassName prop (TDD — test first)
    - Test file: `tests/unit/shared/sort-selector-label.test.ts`
    - Test that SortSelector accepts an optional `labelClassName` prop
    - Test that when `labelClassName="text-gray-200"` is passed, the label element has that class
    - Test that when no `labelClassName` is passed, the label defaults to `text-gray-600`
    - Run test on UNFIXED code — expect FAILURE (prop doesn't exist yet)
    - _Requirements: 1.4, 2.4_

  - [ ] 5.2 Implement the SortSelector labelClassName prop
    - File: `src/ui/shared/SortSelector.tsx`
    - Add optional `labelClassName?: string` to `SortSelectorProps` interface
    - Default to `'text-gray-600'` when not provided (backward compatibility)
    - Apply the prop value to the label element's className
    - _Bug_Condition: SortSelector label on dark bg-brand-secondary background has text-gray-600 (contrast ratio ~2.2:1)_
    - _Expected_Behavior: label has configurable color class, defaulting to text-gray-600 for light backgrounds_
    - _Preservation: dropdown options and select element styling unchanged; default label color unchanged on light backgrounds_
    - _Requirements: 1.4, 2.4, 3.4_

  - [ ] 5.3 Pass labelClassName in popup App header
    - File: `src/ui/popup/App.tsx`
    - Pass `labelClassName="text-gray-200"` to the `<SortSelector>` in the dark header
    - This ensures the sort label meets WCAG AA 4.5:1 contrast ratio against `bg-brand-secondary` (#1e3a5f)
    - _Requirements: 2.4_

  - [ ] 5.4 Verify unit test passes
    - Run: `pnpm vitest --run tests/unit/shared/sort-selector-label.test.ts`
    - **EXPECTED OUTCOME**: Test PASSES (confirms label contrast fix works)
    - _Requirements: 2.4, 3.4_

- [ ] 6. Fix for extension icon not showing in browser toolbar

  - [ ] 6.1 Write integration test for icon path resolution (TDD — test first)
    - Test file: `tests/unit/config/icon-path-resolution.test.ts`
    - Test that the merged manifest's `icons` and `action.default_icon` paths reference files that exist in the `icons/` directory
    - Test that all referenced icon sizes (16, 32, 48, 128) have corresponding PNG files
    - Import `mergeManifest`, `baseManifest`, and `chromeOverride` and verify the output manifest icon paths
    - _Requirements: 1.1, 2.1_

  - [ ] 6.2 Implement the icon path fix in build config
    - File: `vite.config.ts`
    - Move icon handling so that `vite-plugin-web-extension` is aware of the icon files:
      - Option A: Set `publicDir: 'public'` and move icons to `public/icons/` so Vite copies them before the plugin processes the manifest
      - Option B: Add icons to the `webExtension` plugin's `additionalInputs` or configure the plugin to pass through icon paths
      - Option C: Ensure `copyExtensionAssets` runs in `buildStart` or `generateBundle` (before `closeBundle`) so icons exist when the manifest is finalized
    - Verify that `dist/manifest.json` icon paths resolve to existing files after build
    - _Bug_Condition: manifest icon paths don't resolve because icons are copied after manifest generation_
    - _Expected_Behavior: all manifest icon paths resolve to existing PNG files in dist/_
    - _Preservation: icon files still present in dist/icons/, locale files still in dist/_locales/_
    - _Requirements: 1.1, 2.1, 3.1_

  - [ ] 6.3 Verify icon test passes after fix
    - Run: `pnpm vitest --run tests/unit/config/icon-path-resolution.test.ts`
    - **EXPECTED OUTCOME**: Test PASSES (confirms icon paths are valid)
    - _Requirements: 2.1, 3.1_

- [ ] 7. Checkpoint — Ensure all tests pass
  - Run full test suite: `pnpm vitest --run`
  - Ensure all new tests pass (bug condition, preservation, unit tests)
  - Ensure all existing tests still pass (no regressions)
  - Verify lint passes: `pnpm run lint`
  - Verify typecheck passes: `pnpm run typecheck`
  - Ask the user if questions arise
