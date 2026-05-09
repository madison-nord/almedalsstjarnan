# UI Display Bugs — Bugfix Design

## Overview

This design addresses four UI display bugs in the Almedalsstjärnan extension:
1. Extension icon not showing because `vite-plugin-web-extension` rewrites manifest paths but icons are copied post-build to `dist/icons/`
2. Residual "Länk till evenemanget:" label left behind after `stripSourceUrl` removes only the URL
3. Language toggle calling `window.location.reload()` which closes the Chrome popup instead of re-rendering
4. Sort label using `text-gray-600` on a dark `bg-brand-secondary` (#1e3a5f) header, failing WCAG contrast

The fix strategy is minimal and targeted: adjust the build config for icons, expand the regex in `stripSourceUrl`, replace reload with React state-driven re-render for locale, and update the label color class in `SortSelector`.

## Glossary

- **Bug_Condition (C)**: The set of inputs/states that trigger each respective bug
- **Property (P)**: The desired correct behavior when the bug condition holds
- **Preservation**: Existing behaviors that must remain unchanged after the fix
- **`stripSourceUrl`**: Function in `src/ui/popup/components/EventItem.tsx` that removes the source URL from event descriptions
- **`handleLocaleChange`**: Callback in `src/ui/popup/App.tsx` that handles language preference changes
- **`SortSelector`**: Shared component in `src/ui/shared/SortSelector.tsx` rendering the sort dropdown with a visible label
- **`LanguageToggle`**: Shared component in `src/ui/shared/LanguageToggle.tsx` rendering the language switcher
- **`copyExtensionAssets`**: Vite plugin in `vite.config.ts` that copies icons and locales to `dist/` after build
- **`brand-secondary`**: Tailwind color `#1e3a5f` (dark navy) used as the popup header background

## Bug Details

### Bug 1: Extension Icon Not Showing

The bug manifests when the extension is built and loaded in Chrome. The `vite-plugin-web-extension` processes the manifest and rewrites asset paths relative to its output structure, but the actual icon files are only copied to `dist/icons/` by the `copyExtensionAssets` plugin which runs in `closeBundle` — after the manifest has already been generated. The plugin may not recognize the `icons/` paths as valid assets and either strips them or rewrites them incorrectly.

**Formal Specification:**
```
FUNCTION isBugCondition_Icons(input)
  INPUT: input of type BuildOutput
  OUTPUT: boolean

  RETURN input.manifest.icons paths DO NOT resolve to existing files
         OR input.manifest.action.default_icon paths DO NOT resolve to existing files
END FUNCTION
```

### Bug 2: Empty "Länk till evenemanget:" Label

The bug manifests when an event description contains the pattern `"Länk till evenemanget: <URL>"`. The current `stripSourceUrl` function only removes the bare URL via `description.replace(sourceUrl, '').trim()`, leaving the Swedish label text "Länk till evenemanget:" as a residual artifact in the displayed description.

**Formal Specification:**
```
FUNCTION isBugCondition_LinkLabel(input)
  INPUT: input of type { description: string, sourceUrl: string | null }
  OUTPUT: boolean

  RETURN input.sourceUrl IS NOT NULL
         AND input.description CONTAINS ("Länk till evenemanget: " + input.sourceUrl)
END FUNCTION
```

### Bug 3: Language Toggle Doesn't Work

The bug manifests when the user selects a different language in the popup. The `handleLocaleChange` callback calls `window.location.reload()`, but in a Chrome extension popup, reloading the page causes the popup to close entirely. The user sees the popup disappear and must reopen it manually.

**Formal Specification:**
```
FUNCTION isBugCondition_LanguageToggle(input)
  INPUT: input of type { selectedLocale: 'sv' | 'en' | null, environment: string }
  OUTPUT: boolean

  RETURN input.environment = "chrome_extension_popup"
         AND locale change triggers window.location.reload()
END FUNCTION
```

### Bug 4: Sort Label Barely Visible

The bug manifests when the `SortSelector` is rendered inside the popup header which has `bg-brand-secondary` (#1e3a5f dark navy). The label uses `text-gray-600` (#4b5563) which has a contrast ratio of approximately 2.2:1 against #1e3a5f — well below the WCAG AA minimum of 4.5:1.

**Formal Specification:**
```
FUNCTION isBugCondition_SortLabel(input)
  INPUT: input of type { parentBackground: CSSColor }
  OUTPUT: boolean

  RETURN luminanceContrast(input.parentBackground, gray-600) < 4.5
         AND component is SortSelector label
END FUNCTION
```

### Examples

- **Bug 1**: Build extension → load in Chrome → toolbar shows generic puzzle piece icon instead of the star icon
- **Bug 2**: Event with description `"Workshop om AI\nLänk till evenemanget: https://example.com/event/123"` displays as `"Workshop om AI\nLänk till evenemanget:"` after stripping
- **Bug 3**: User selects "English" in language dropdown → popup closes → user must reopen popup to see English strings
- **Bug 4**: "Sortera:" label in header is dark gray on dark navy background, nearly invisible

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Mouse clicks on all buttons and interactive elements must continue to work
- Event descriptions that do NOT contain the "Länk till evenemanget:" pattern must display unchanged
- The `stripSourceUrl` function must still remove bare sourceUrl occurrences (without the label prefix)
- The language preference must still be persisted via `SET_LANGUAGE_PREFERENCE` message
- The sort dropdown options and select element styling must remain unchanged on light backgrounds
- Icon files must still be present in `dist/icons/` after build
- Locale files must still be present in `dist/_locales/` after build
- The `SortSelector` dropdown itself (not the label) must keep its current styling

**Scope:**
All inputs that do NOT involve the four bug conditions should be completely unaffected by this fix. This includes:
- Events without "Länk till evenemanget:" in their description
- Non-popup contexts (stars page language toggle behavior)
- Sort selector rendering on light/white backgrounds
- All other manifest fields and build outputs

## Hypothesized Root Cause

### Bug 1: Icon Path Resolution

The `vite-plugin-web-extension` processes the manifest returned by the `manifest()` function. It expects asset paths to be relative to the project root and attempts to resolve/rewrite them. Since `icons/icon-16.png` etc. are not Vite-managed assets (they're copied post-build by `copyExtensionAssets`), the plugin either:
1. Fails to find them and omits the paths, or
2. Rewrites them to incorrect locations in the output

**Root cause**: The icon paths in the manifest need to be treated as pre-existing assets that the plugin should pass through without rewriting. The `webResources` or `additionalInputs` configuration may need to include the icons, or the manifest should reference paths that align with where the plugin expects static assets.

### Bug 2: Incomplete Regex in stripSourceUrl

The current implementation:
```typescript
return description.replace(sourceUrl, '').trim();
```
Only removes the URL itself. When the description contains `"Länk till evenemanget: https://..."`, removing just the URL leaves `"Länk till evenemanget: "` (or `"Länk till evenemanget:"` after trim of trailing space, but not the label line itself).

**Root cause**: The `replace` call needs to also match and remove the preceding label text `"Länk till evenemanget: "` (and optionally `"Länk till evenemanget:"` without trailing space).

### Bug 3: Popup Closes on Reload

Chrome extension popups are ephemeral — calling `window.location.reload()` destroys the popup window. The `handleLocaleChange` in `App.tsx` directly calls `window.location.reload()`.

**Root cause**: The locale change should trigger a React re-render with new message strings rather than a full page reload. This requires the App component to track locale state and pass it through to force re-fetching of i18n strings.

### Bug 4: Wrong Text Color Class

The `SortSelector` component uses a hardcoded `text-gray-600` class for its label. This works on white/light backgrounds but fails on the dark `bg-brand-secondary` header where it's actually rendered in the popup.

**Root cause**: The label color needs to be configurable or context-aware. Since the component is shared between popup (dark header) and stars page (potentially different background), the simplest fix is to accept an optional label class prop or always use a color that works in both contexts.

## Correctness Properties

Property 1: Bug Condition - Icon paths resolve in built manifest

_For any_ build output where the manifest contains icon paths, the fixed build process SHALL produce a `dist/` directory where all icon paths referenced in `manifest.json` resolve to existing PNG files.

**Validates: Requirements 2.1**

Property 2: Bug Condition - Link label fully stripped from description

_For any_ event description containing the pattern "Länk till evenemanget: {URL}" where {URL} matches the event's sourceUrl, the fixed `stripSourceUrl` function SHALL return a description containing neither the label text "Länk till evenemanget:" nor the URL.

**Validates: Requirements 2.2**

Property 3: Bug Condition - Language change re-renders without reload

_For any_ locale change action in the Chrome extension popup, the fixed `handleLocaleChange` SHALL update the UI strings to reflect the new locale without calling `window.location.reload()`, keeping the popup open.

**Validates: Requirements 2.3**

Property 4: Bug Condition - Sort label meets contrast requirements

_For any_ rendering of the SortSelector inside a dark-background header (brand-secondary), the fixed component SHALL display the label text with a contrast ratio of at least 4.5:1 against the background.

**Validates: Requirements 2.4**

Property 5: Preservation - Descriptions without link label unchanged

_For any_ event description that does NOT contain the "Länk till evenemanget:" pattern, the fixed `stripSourceUrl` function SHALL produce the same result as the original function, preserving all existing stripping behavior for bare URLs.

**Validates: Requirements 3.2**

Property 6: Preservation - Language preference persistence unchanged

_For any_ language preference change, the fixed code SHALL continue to persist the preference via `SET_LANGUAGE_PREFERENCE` and load it correctly on next popup open.

**Validates: Requirements 3.5, 3.6**

Property 7: Preservation - Sort dropdown styling unchanged

_For any_ rendering of the SortSelector dropdown element and its options, the fixed component SHALL produce the same visual output as the original for the select element itself (only the label color changes).

**Validates: Requirements 3.4**

## Fix Implementation

### Changes Required

#### Bug 1: Fix Icon Paths in Build

**File**: `vite.config.ts`

**Specific Changes**:
1. **Add icons to webExtension config**: Use the `browser` or `additionalInputs` option, or configure the plugin's `webAccessibleResources` to include icon files so the plugin knows about them.
2. **Alternative — use `publicDir`**: Move icons to a `public/icons/` directory and set `publicDir: 'public'` so Vite copies them automatically and the plugin can resolve the paths.
3. **Preferred approach**: Configure `vite-plugin-web-extension` with `assets` or ensure the `copyExtensionAssets` plugin runs before the manifest is finalized. The simplest fix is to move icon copying into the plugin's awareness by listing them in the manifest function's return with paths that will exist in the output.

**Most likely fix**: Change `publicDir: false` to `publicDir: 'public'`, create a `public/icons/` directory with the icon files (or symlink), so Vite natively serves them and the web-extension plugin can resolve the paths. Alternatively, keep the current structure but ensure the manifest references paths as they'll appear in `dist/` (which they already do as `icons/icon-*.png`), and configure the plugin to not rewrite these specific paths.

**Simplest fix**: Move the icons into a structure the plugin recognizes. Since `copyExtensionAssets` already copies `icons/` to `dist/icons/`, the issue is likely that the plugin validates paths at build time. Adding the icons directory to `additionalInputs` or using the plugin's `assets` option should resolve this.

#### Bug 2: Expand stripSourceUrl Regex

**File**: `src/ui/popup/components/EventItem.tsx`

**Function**: `stripSourceUrl`

**Specific Changes**:
1. **Replace the simple string replace** with a regex that matches the full pattern including the label prefix
2. **Pattern to match**: `Länk till evenemanget:\s*{sourceUrl}` — this captures the label with optional whitespace before the URL
3. **Also handle the line**: If the label+URL is on its own line, remove the entire line (including preceding newline)
4. **Keep the existing bare-URL removal** as a fallback for descriptions that contain the URL without the label prefix

**Implementation**:
```typescript
export function stripSourceUrl(description: string, sourceUrl: string | null): string {
  if (!sourceUrl || !description) return description;
  if (!description.includes(sourceUrl)) return description;
  
  // Remove "Länk till evenemanget: <URL>" pattern (with optional newline before)
  const labelPattern = new RegExp(
    `\\n?Länk till evenemanget:\\s*${escapeRegExp(sourceUrl)}`,
    'g'
  );
  let result = description.replace(labelPattern, '');
  
  // Fallback: remove bare URL if still present
  if (result.includes(sourceUrl)) {
    result = result.replace(sourceUrl, '');
  }
  
  return result.trim();
}
```

#### Bug 3: Replace Reload with React Re-render

**File**: `src/ui/popup/App.tsx`

**Function**: `handleLocaleChange`

**Specific Changes**:
1. **Remove `window.location.reload()`** from `handleLocaleChange`
2. **Add a `localeKey` state** (a counter or the locale value) that forces re-render of child components
3. **Use a `key` prop** on the main content wrapper keyed to the locale, causing React to remount children and re-fetch i18n strings from the adapter
4. **Alternative simpler approach**: Since `adapter.getMessage()` reads from the extension's i18n system which requires a reload to pick up new locale, instead show a message telling the user to reopen the popup, or trigger a close-and-reopen pattern

**Preferred approach**: Since Chrome's `chrome.i18n.getMessage()` uses the browser locale and the extension's `SET_LANGUAGE_PREFERENCE` likely controls which messages are returned by the adapter, the simplest correct fix is:
- Add a `locale` state to App
- Pass it as a `key` to force remount when locale changes
- Ensure the adapter re-reads messages for the new locale on remount

**File**: `src/ui/shared/LanguageToggle.tsx`

**Specific Changes**:
- Remove the `{changed && <span>...reloadPopupHint...</span>}` hint since reload is no longer needed
- The `onLocaleChange` callback already notifies the parent — no change needed here

#### Bug 4: Fix Sort Label Contrast

**File**: `src/ui/shared/SortSelector.tsx`

**Specific Changes**:
1. **Add an optional `labelClassName` prop** to `SortSelectorProps` for the label text color
2. **Default to `text-gray-600`** for backward compatibility on light backgrounds
3. **Pass `text-gray-200`** from the popup header context where the background is dark
4. **Alternative simpler approach**: Since the SortSelector is always rendered in the dark header in the popup, change the hardcoded class to one that works in both contexts, or accept a `variant` prop (`'light' | 'dark'`)

**Preferred approach**: Add an optional `labelClassName` prop with a sensible default:
```typescript
export interface SortSelectorProps {
  readonly currentOrder: SortOrder;
  readonly onOrderChange: (order: SortOrder) => void;
  readonly adapter: IBrowserApiAdapter;
  readonly labelClassName?: string;
}
```

Then in the popup's `App.tsx`, pass `labelClassName="text-gray-200"` to ensure the label is visible on the dark header.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs on unfixed code, then verify the fixes work correctly and preserve existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix. Confirm or refute the root cause analysis.

**Test Plan**: Write tests that exercise each bug condition and assert the expected behavior. Run on UNFIXED code to observe failures.

**Test Cases**:
1. **Icon Path Test**: Build the extension and verify `dist/manifest.json` icon paths resolve to existing files (will fail on unfixed code)
2. **Link Label Strip Test**: Call `stripSourceUrl` with description containing "Länk till evenemanget: https://example.com" and assert no residual label (will fail on unfixed code)
3. **Language Toggle Test**: Simulate locale change and verify `window.location.reload` is NOT called (will fail on unfixed code)
4. **Sort Label Contrast Test**: Render SortSelector and verify label has a light text class (will fail on unfixed code)

**Expected Counterexamples**:
- `stripSourceUrl("Info\nLänk till evenemanget: https://x.com", "https://x.com")` returns `"Info\nLänk till evenemanget:"` instead of `"Info"`
- `handleLocaleChange` calls `window.location.reload()` causing popup closure
- SortSelector label element has class `text-gray-600` regardless of context

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
// Bug 2: Link label stripping
FOR ALL input WHERE isBugCondition_LinkLabel(input) DO
  result := stripSourceUrl'(input.description, input.sourceUrl)
  ASSERT NOT result.contains("Länk till evenemanget:")
  ASSERT NOT result.contains(input.sourceUrl)
END FOR

// Bug 4: Sort label contrast
FOR ALL input WHERE isBugCondition_SortLabel(input) DO
  result := renderSortSelector'(input)
  ASSERT result.labelClassName includes light color class
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
// Bug 2: Descriptions without the label pattern
FOR ALL input WHERE NOT isBugCondition_LinkLabel(input) DO
  ASSERT stripSourceUrl(input.description, input.sourceUrl) = stripSourceUrl'(input.description, input.sourceUrl)
END FOR

// Bug 4: Sort selector on light backgrounds
FOR ALL input WHERE NOT isBugCondition_SortLabel(input) DO
  ASSERT renderSortSelector(input) = renderSortSelector'(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for Bug 2 preservation checking because:
- It generates many description/URL combinations automatically
- It catches edge cases like partial matches, multiple URLs, or unusual whitespace
- It provides strong guarantees that non-buggy descriptions are unchanged

**Test Plan**: Observe behavior on UNFIXED code first for descriptions without the label pattern, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Description Without Label Preservation**: Verify descriptions containing only a bare URL (no "Länk till evenemanget:" prefix) are stripped identically before and after fix
2. **Description Without URL Preservation**: Verify descriptions with no sourceUrl at all are returned unchanged
3. **Sort Dropdown Preservation**: Verify the select element and options render identically regardless of label color changes

### Unit Tests

- Test `stripSourceUrl` with various description patterns (label+URL, bare URL, no URL, multiple occurrences)
- Test `stripSourceUrl` with edge cases (URL at start, URL at end, URL on its own line, empty description)
- Test that `handleLocaleChange` does NOT call `window.location.reload()`
- Test that SortSelector accepts and applies `labelClassName` prop
- Test that SortSelector defaults to `text-gray-600` when no `labelClassName` is provided

### Property-Based Tests

- Generate random descriptions with/without "Länk till evenemanget:" pattern and verify correct stripping behavior
- Generate random descriptions WITHOUT the label pattern and verify preservation (output identical to original function)
- Generate random sourceUrl values with special regex characters and verify no regex errors

### Integration Tests

- Build the extension and verify all manifest icon paths resolve to existing files in `dist/`
- Open popup, change language, verify popup stays open and strings update
- Verify sort label is visible (has appropriate contrast class) in the popup header context
