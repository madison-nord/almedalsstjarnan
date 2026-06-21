# Bugfix Requirements Document

## Introduction

This document addresses four UI display bugs in the Almedalsstjärnan browser extension that degrade the user experience: missing extension icons in the browser toolbar/tab, an empty "Länk till evenemanget:" label shown in event descriptions, a non-functional language toggle, and a barely visible sort selector label on dark header backgrounds.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the extension is built and loaded in Chrome THEN the extension icon does not appear in the browser toolbar or extensions page because the Vite web-extension plugin rewrites manifest asset paths but the icons are copied to `dist/icons/` after the manifest is already generated, causing a path mismatch in the final `manifest.json`

1.2 WHEN an event's ICS description contains the pattern "Länk till evenemanget: <URL>" and the `stripSourceUrl` function removes only the URL portion THEN the system displays a residual empty label "Länk till evenemanget:" in the expanded event description

1.3 WHEN the user selects a different language in the LanguageToggle dropdown THEN the system calls `window.location.reload()` but the Chrome extension popup closes on reload instead of applying the new locale, making the language change appear to have no effect

1.4 WHEN the SortSelector is rendered inside the popup or stars page header (which has a `bg-brand-secondary` dark background) THEN the sort label text uses `text-gray-600` class which has insufficient contrast against the dark background, making it barely visible

### Expected Behavior (Correct)

2.1 WHEN the extension is built and loaded in Chrome THEN the system SHALL display the correct extension icon (from `icons/` folder) in the browser toolbar, extensions page, and browser tab

2.2 WHEN an event's description contains the pattern "Länk till evenemanget: <URL>" THEN the system SHALL strip both the label text "Länk till evenemanget:" and the URL from the displayed description, leaving no residual empty label

2.3 WHEN the user selects a different language in the LanguageToggle dropdown THEN the system SHALL persist the preference and re-render the popup UI with the new locale strings without requiring a manual popup reopen (or clearly communicate that the popup must be reopened)

2.4 WHEN the SortSelector is rendered inside a dark-background header THEN the system SHALL display the sort label text with sufficient contrast (meeting WCAG 2.1 AA 4.5:1 ratio), using a light color such as `text-gray-200` or `text-white`

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the extension is built THEN the system SHALL CONTINUE TO copy icon files to `dist/icons/` and locale files to `dist/_locales/` correctly

3.2 WHEN an event description does NOT contain the "Länk till evenemanget:" pattern THEN the system SHALL CONTINUE TO display the description unchanged (only stripping the bare sourceUrl if present)

3.3 WHEN the user has not changed the language preference THEN the system SHALL CONTINUE TO use the browser's default locale for all UI strings

3.4 WHEN the SortSelector dropdown options and select element are rendered THEN the system SHALL CONTINUE TO display them with proper styling and contrast on their white/light backgrounds

3.5 WHEN the LanguageToggle saves a preference via SET_LANGUAGE_PREFERENCE THEN the system SHALL CONTINUE TO persist it correctly in storage.local

3.6 WHEN the popup is opened after a language change THEN the system SHALL CONTINUE TO load the stored preference and apply it to the UI

---

## Bug Condition Derivation

### Bug 1: Extension Icon Not Showing

```pascal
FUNCTION isBugCondition_Icons(X)
  INPUT: X of type BuildOutput
  OUTPUT: boolean

  // The bug occurs when the manifest references icon paths that don't resolve
  // correctly relative to the built manifest location
  RETURN X.manifestIconPaths DO NOT resolve to actual icon files in the build output
END FUNCTION
```

```pascal
// Property: Fix Checking - Icons appear in built extension
FOR ALL X WHERE isBugCondition_Icons(X) DO
  result ← build'(X)
  ASSERT result.manifest.icons resolve to existing files in dist/
  ASSERT result.manifest.action.default_icon resolve to existing files in dist/
END FOR
```

### Bug 2: Empty "Länk till evenemanget:" Label

```pascal
FUNCTION isBugCondition_LinkLabel(X)
  INPUT: X of type { description: string, sourceUrl: string | null }
  OUTPUT: boolean

  RETURN X.sourceUrl IS NOT NULL
    AND X.description CONTAINS "Länk till evenemanget: " + X.sourceUrl
END FUNCTION
```

```pascal
// Property: Fix Checking - Link label stripped from description
FOR ALL X WHERE isBugCondition_LinkLabel(X) DO
  result ← stripSourceUrl'(X.description, X.sourceUrl)
  ASSERT result DOES NOT CONTAIN "Länk till evenemanget:"
  ASSERT result DOES NOT CONTAIN X.sourceUrl
END FOR
```

```pascal
// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition_LinkLabel(X) DO
  ASSERT stripSourceUrl(X.description, X.sourceUrl) = stripSourceUrl'(X.description, X.sourceUrl)
END FOR
```

### Bug 3: Language Toggle Doesn't Work

```pascal
FUNCTION isBugCondition_LanguageToggle(X)
  INPUT: X of type { currentLocale: string | null, selectedLocale: string | null }
  OUTPUT: boolean

  RETURN X.selectedLocale IS NOT EQUAL TO X.currentLocale
    AND environment IS Chrome extension popup
END FUNCTION
```

```pascal
// Property: Fix Checking - Language change takes effect
FOR ALL X WHERE isBugCondition_LanguageToggle(X) DO
  result ← handleLocaleChange'(X.selectedLocale)
  ASSERT UI strings reflect X.selectedLocale after the change completes
END FOR
```

```pascal
// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition_LanguageToggle(X) DO
  ASSERT languageToggle(X) = languageToggle'(X)
END FOR
```

### Bug 4: Sort Label Barely Visible

```pascal
FUNCTION isBugCondition_SortLabel(X)
  INPUT: X of type { parentBackground: CSSColor }
  OUTPUT: boolean

  RETURN X.parentBackground IS dark (e.g., brand-secondary)
END FUNCTION
```

```pascal
// Property: Fix Checking - Sort label has sufficient contrast
FOR ALL X WHERE isBugCondition_SortLabel(X) DO
  result ← renderSortSelector'(X)
  ASSERT contrastRatio(result.labelColor, X.parentBackground) >= 4.5
END FOR
```

```pascal
// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition_SortLabel(X) DO
  ASSERT renderSortSelector(X) = renderSortSelector'(X)
END FOR
```
