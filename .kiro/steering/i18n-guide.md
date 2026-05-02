---
inclusion: fileMatch
fileMatchPattern: '**/*.tsx'
---

# Internationalization (i18n) Guide

## Principles

- All user-facing strings MUST use message keys from `_locales/{locale}/messages.json`.
- Access strings via `adapter.getMessage(key)` — never hardcode UI text in React components, content scripts, or manifests.
- Swedish (`sv`) is the default locale.
- English (`en`) is the secondary locale.
- If the browser language is neither `sv` nor `en`, Swedish is displayed.

## Adding a New String

1. Add the key to BOTH `_locales/sv/messages.json` and `_locales/en/messages.json`.
2. Each entry must have `message` and `description` fields.
3. Use descriptive key names in camelCase (e.g., `emptyStateTitle`, `exportToCalendar`).

## What to Localize

- Manifest name and description (via `__MSG_extensionName__` and `__MSG_extensionDescription__`).
- Popup UI labels and headings.
- Stars Page labels, column headers, and headings.
- Star Button accessible labels (`aria-label`).
- Sort order display names.
- Empty state messages.
- Export button label.
- Error and success messages.
- The source label in ICS DESCRIPTION: `"Källa:"` for Swedish, `"Source:"` for English.

## What NOT to Localize

- Event content from the host page: titles, descriptions, locations, organiser names, topic names, source URLs.
- The export filename pattern: `almedalsstjarnan-starred-events-YYYYMMDD-HHMMSS.ics`.
- ICS field names and structural content (VCALENDAR, VEVENT, etc.).

## Manifest References

The manifest uses Chrome's built-in i18n:
- `"name": "__MSG_extensionName__"`
- `"description": "__MSG_extensionDescription__"`

These are resolved by the browser from `_locales/{locale}/messages.json`.

## i18n Catalog Reference

See `.kiro/specs/almedals-planner-extension/i18n-catalog.md` for the complete list of all 26 message keys with their Swedish and English values.
