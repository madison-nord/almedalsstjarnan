# i18n Message Key Catalog

All user-facing strings are defined in `_locales/{locale}/messages.json`. No hardcoded user-facing strings shall appear in React components, content scripts, or generated manifests. All strings are accessed via `chrome.i18n.getMessage` through the Browser API Adapter.

## Key Summary

| Key | Swedish (sv) | English (en) | Used By |
|---|---|---|---|
| `extensionName` | Almedalsstjärnan | Almedalsstjärnan | Manifest |
| `extensionDescription` | Stjärnmärk evenemang i Almedalsveckans program och exportera ditt schema som kalenderfil. | Star events in the Almedalsveckan programme and export your schedule as a calendar file. | Manifest |
| `starEvent` | Stjärnmärk evenemang | Star event | Star Button (aria-label) |
| `unstarEvent` | Ta bort stjärnmärkning | Unstar event | Star Button (aria-label) |
| `popupTitle` | Stjärnmärkta evenemang | Starred events | Popup UI |
| `starsPageTitle` | Alla stjärnmärkta evenemang | All starred events | Stars Page |
| `openFullList` | Öppna hela listan | Open full list | Popup UI |
| `exportToCalendar` | Exportera till kalender | Export to calendar | Stars Page |
| `sortChronological` | Kronologisk | Chronological | Popup UI, Stars Page |
| `sortReverseChronological` | Omvänd kronologisk | Reverse chronological | Popup UI, Stars Page |
| `sortAlphabeticalTitle` | Titel A–Ö | Title A–Z | Popup UI, Stars Page |
| `sortStarredDesc` | Senast stjärnmärkta | Recently starred | Popup UI, Stars Page |
| `sortLabel` | Sortera efter | Sort by | Popup UI, Stars Page |
| `emptyStateTitle` | Inga stjärnmärkta evenemang | No starred events | Popup UI, Stars Page |
| `emptyStateMessage` | Besök Almedalsveckans program och klicka på stjärnan för att spara evenemang. | Visit the Almedalsveckan programme and click the star to save events. | Popup UI, Stars Page |
| `unstarAction` | Ta bort | Remove | Stars Page |
| `icsSourceLabel` | Källa: | Source: | ICS Generator |
| `errorStorageFailed` | Kunde inte spara. Försök igen. | Could not save. Please try again. | Popup UI, Stars Page, Content Script |
| `errorExportFailed` | Exporten misslyckades. Försök igen. | Export failed. Please try again. | Stars Page |
| `successExport` | Kalenderfil exporterad. | Calendar file exported. | Stars Page |
| `columnTitle` | Titel | Title | Stars Page |
| `columnOrganiser` | Arrangör | Organiser | Stars Page |
| `columnDateTime` | Datum & tid | Date & time | Stars Page |
| `columnLocation` | Plats | Location | Stars Page |
| `columnTopic` | Ämne | Topic | Stars Page |
| `columnActions` | Åtgärder | Actions | Stars Page |

## Full Locale Files

### `_locales/sv/messages.json`

```json
{
  "extensionName": {
    "message": "Almedalsstjärnan",
    "description": "Extension name shown in browser"
  },
  "extensionDescription": {
    "message": "Stjärnmärk evenemang i Almedalsveckans program och exportera ditt schema som kalenderfil.",
    "description": "Extension description shown in browser"
  },
  "starEvent": {
    "message": "Stjärnmärk evenemang",
    "description": "Accessible label for star button when event is not starred"
  },
  "unstarEvent": {
    "message": "Ta bort stjärnmärkning",
    "description": "Accessible label for star button when event is starred"
  },
  "popupTitle": {
    "message": "Stjärnmärkta evenemang",
    "description": "Popup window title"
  },
  "starsPageTitle": {
    "message": "Alla stjärnmärkta evenemang",
    "description": "Stars page title"
  },
  "openFullList": {
    "message": "Öppna hela listan",
    "description": "Button to open stars page from popup"
  },
  "exportToCalendar": {
    "message": "Exportera till kalender",
    "description": "Export button label"
  },
  "sortChronological": {
    "message": "Kronologisk",
    "description": "Sort order: earliest first"
  },
  "sortReverseChronological": {
    "message": "Omvänd kronologisk",
    "description": "Sort order: latest first"
  },
  "sortAlphabeticalTitle": {
    "message": "Titel A–Ö",
    "description": "Sort order: alphabetical by title"
  },
  "sortStarredDesc": {
    "message": "Senast stjärnmärkta",
    "description": "Sort order: most recently starred first"
  },
  "sortLabel": {
    "message": "Sortera efter",
    "description": "Label for sort selector"
  },
  "emptyStateTitle": {
    "message": "Inga stjärnmärkta evenemang",
    "description": "Empty state heading"
  },
  "emptyStateMessage": {
    "message": "Besök Almedalsveckans program och klicka på stjärnan för att spara evenemang.",
    "description": "Empty state body text"
  },
  "unstarAction": {
    "message": "Ta bort",
    "description": "Unstar action label in stars page grid"
  },
  "icsSourceLabel": {
    "message": "Källa:",
    "description": "Source label prefix in ICS DESCRIPTION field"
  },
  "errorStorageFailed": {
    "message": "Kunde inte spara. Försök igen.",
    "description": "Generic storage error message"
  },
  "errorExportFailed": {
    "message": "Exporten misslyckades. Försök igen.",
    "description": "ICS export error message"
  },
  "successExport": {
    "message": "Kalenderfil exporterad.",
    "description": "ICS export success message"
  },
  "columnTitle": {
    "message": "Titel",
    "description": "Stars page grid column header"
  },
  "columnOrganiser": {
    "message": "Arrangör",
    "description": "Stars page grid column header"
  },
  "columnDateTime": {
    "message": "Datum & tid",
    "description": "Stars page grid column header"
  },
  "columnLocation": {
    "message": "Plats",
    "description": "Stars page grid column header"
  },
  "columnTopic": {
    "message": "Ämne",
    "description": "Stars page grid column header"
  },
  "columnActions": {
    "message": "Åtgärder",
    "description": "Stars page grid column header"
  }
}
```

### `_locales/en/messages.json`

```json
{
  "extensionName": {
    "message": "Almedalsstjärnan",
    "description": "Extension name shown in browser"
  },
  "extensionDescription": {
    "message": "Star events in the Almedalsveckan programme and export your schedule as a calendar file.",
    "description": "Extension description shown in browser"
  },
  "starEvent": {
    "message": "Star event",
    "description": "Accessible label for star button when event is not starred"
  },
  "unstarEvent": {
    "message": "Unstar event",
    "description": "Accessible label for star button when event is starred"
  },
  "popupTitle": {
    "message": "Starred events",
    "description": "Popup window title"
  },
  "starsPageTitle": {
    "message": "All starred events",
    "description": "Stars page title"
  },
  "openFullList": {
    "message": "Open full list",
    "description": "Button to open stars page from popup"
  },
  "exportToCalendar": {
    "message": "Export to calendar",
    "description": "Export button label"
  },
  "sortChronological": {
    "message": "Chronological",
    "description": "Sort order: earliest first"
  },
  "sortReverseChronological": {
    "message": "Reverse chronological",
    "description": "Sort order: latest first"
  },
  "sortAlphabeticalTitle": {
    "message": "Title A–Z",
    "description": "Sort order: alphabetical by title"
  },
  "sortStarredDesc": {
    "message": "Recently starred",
    "description": "Sort order: most recently starred first"
  },
  "sortLabel": {
    "message": "Sort by",
    "description": "Label for sort selector"
  },
  "emptyStateTitle": {
    "message": "No starred events",
    "description": "Empty state heading"
  },
  "emptyStateMessage": {
    "message": "Visit the Almedalsveckan programme and click the star to save events.",
    "description": "Empty state body text"
  },
  "unstarAction": {
    "message": "Remove",
    "description": "Unstar action label in stars page grid"
  },
  "icsSourceLabel": {
    "message": "Source:",
    "description": "Source label prefix in ICS DESCRIPTION field"
  },
  "errorStorageFailed": {
    "message": "Could not save. Please try again.",
    "description": "Generic storage error message"
  },
  "errorExportFailed": {
    "message": "Export failed. Please try again.",
    "description": "ICS export error message"
  },
  "successExport": {
    "message": "Calendar file exported.",
    "description": "ICS export success message"
  },
  "columnTitle": {
    "message": "Title",
    "description": "Stars page grid column header"
  },
  "columnOrganiser": {
    "message": "Organiser",
    "description": "Stars page grid column header"
  },
  "columnDateTime": {
    "message": "Date & time",
    "description": "Stars page grid column header"
  },
  "columnLocation": {
    "message": "Location",
    "description": "Stars page grid column header"
  },
  "columnTopic": {
    "message": "Topic",
    "description": "Stars page grid column header"
  },
  "columnActions": {
    "message": "Actions",
    "description": "Stars page grid column header"
  }
}
```
