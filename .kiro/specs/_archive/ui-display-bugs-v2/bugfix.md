# Bugfix Requirements Document

## Introduction

This document addresses four UI display bugs in the Almedalsstjärnan browser extension that affect the popup event detail view, the programme page star interaction, the stars page event expansion, and the help modal translations. These bugs degrade the user experience by showing duplicate information, coupling unrelated UI actions, missing expected functionality, and presenting confusing/inconsistent help text.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN an event is expanded in the popup THEN the system displays the formatted date/time both in the collapsed summary area AND again as the first line inside the expanded detail section, resulting in a duplicate display

1.2 WHEN a user clicks the star button on an event card on the programme page (content script) THEN the system both toggles the star state AND triggers the native expand/unfold behavior of the host page's event card, coupling two independent actions

1.3 WHEN a user views events on the stars page (full list) THEN the system provides no expand/collapse mechanism to reveal event details (description, topic, full time range), unlike the popup which has this capability

1.4 WHEN the help modal is displayed with Swedish translations THEN the system shows descriptions that reference a "link" without clarifying which link or where to find it (e.g., `helpGroupStarsPageDesc` says "Öppna via länken i popupen" which is vague) and the Swedish `helpModalTitle` reads "Snabbguide" while the English reads "What can Almedalsstjärnan do?" — inconsistent in meaning and framing across languages

### Expected Behavior (Correct)

2.1 WHEN an event is expanded in the popup THEN the system SHALL display the date/time only once — in the collapsed summary area — and NOT repeat it inside the expanded detail section

2.2 WHEN a user clicks the star button on an event card on the programme page THEN the system SHALL only toggle the star state without triggering the native expand/unfold behavior of the host page's event card (the click event SHALL NOT propagate to parent elements)

2.3 WHEN a user views events on the stars page THEN the system SHALL provide an expand/collapse toggle per event row that reveals additional details (description, topic, full time range), consistent with the popup's expand behavior

2.4 WHEN the help modal is displayed THEN the system SHALL show consistent titles and descriptions across Swedish and English that convey the same meaning, and the Swedish `helpGroupStarsPageDesc` SHALL clearly state how to open the stars page (e.g., "Klicka på 'Öppna hela listan' i popupen") instead of vaguely referencing "länken"

### Unchanged Behavior (Regression Prevention)

3.1 WHEN an event is collapsed in the popup THEN the system SHALL CONTINUE TO display the date/time, organiser, and location in the summary area exactly as before

3.2 WHEN an event is expanded in the popup THEN the system SHALL CONTINUE TO display the topic and description in the expanded detail section

3.3 WHEN a user clicks the star button on the programme page THEN the system SHALL CONTINUE TO toggle the starred state, send the STAR_EVENT/UNSTAR_EVENT message, and update all star buttons for cross-page consistency

3.4 WHEN a user interacts with the stars page (sorting, filtering, bulk actions, export, unstar) THEN the system SHALL CONTINUE TO function exactly as before

3.5 WHEN the help modal is opened in either language THEN the system SHALL CONTINUE TO display all 9 feature groups with icons, headings, and descriptions

3.6 WHEN the help modal is opened THEN the system SHALL CONTINUE TO support keyboard navigation, focus trapping, and dismiss via Escape key

3.7 WHEN a user expands/collapses an event card natively on the programme page (by clicking the card title or existing toggle) THEN the system SHALL CONTINUE TO expand/collapse normally

---

## Bug Condition Derivation

### Bug 1: Duplicate Date/Time in Expanded Popup

```pascal
FUNCTION isBugCondition_DuplicateDateTime(X)
  INPUT: X of type PopupEventItem
  OUTPUT: boolean
  
  RETURN X.expanded = true AND X.startDateTime IS NOT NULL AND X.endDateTime IS NOT NULL
END FUNCTION
```

```pascal
// Property: Fix Checking — No duplicate date/time
FOR ALL X WHERE isBugCondition_DuplicateDateTime(X) DO
  renderedOutput ← renderEventItem'(X)
  formattedDateTime ← formatEventDateTime(X.startDateTime, X.endDateTime, X.locale)
  ASSERT occurrences(renderedOutput, formattedDateTime) = 1
END FOR
```

### Bug 2: Auto-Unfolding on Star Click

```pascal
FUNCTION isBugCondition_AutoUnfold(X)
  INPUT: X of type StarButtonClickEvent
  OUTPUT: boolean
  
  RETURN X.clickTarget = "star-button" AND X.context = "programme-page"
END FUNCTION
```

```pascal
// Property: Fix Checking — Star click does not propagate
FOR ALL X WHERE isBugCondition_AutoUnfold(X) DO
  cardState ← getCardExpandState'(X.card)
  ASSERT cardState.expanded = cardState.previousExpanded
END FOR
```

### Bug 3: Missing Expansion on Stars Page

```pascal
FUNCTION isBugCondition_NoExpansion(X)
  INPUT: X of type StarsPageEventRow
  OUTPUT: boolean
  
  RETURN X.page = "stars" AND X.wantsDetails = true
END FUNCTION
```

```pascal
// Property: Fix Checking — Stars page rows are expandable
FOR ALL X WHERE isBugCondition_NoExpansion(X) DO
  expandToggle ← findExpandToggle'(X.row)
  ASSERT expandToggle IS NOT NULL
  clickToggle(expandToggle)
  ASSERT X.row.detailsVisible = true
END FOR
```

### Bug 4: Inconsistent Help Translations

```pascal
FUNCTION isBugCondition_InconsistentTranslation(X)
  INPUT: X of type HelpModalContent
  OUTPUT: boolean
  
  RETURN X.locale = "sv" AND (X.key = "helpModalTitle" OR X.key = "helpGroupStarsPageDesc")
END FUNCTION
```

```pascal
// Property: Fix Checking — Swedish translations are clear and consistent
FOR ALL X WHERE isBugCondition_InconsistentTranslation(X) DO
  svMessage ← getMessage'(X.key, "sv")
  enMessage ← getMessage'(X.key, "en")
  ASSERT semanticEquivalent(svMessage, enMessage)
  ASSERT NOT contains(svMessage, vague_reference("länken"))
END FOR
```

### Preservation Goal

```pascal
// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition_DuplicateDateTime(X)
           AND NOT isBugCondition_AutoUnfold(X)
           AND NOT isBugCondition_NoExpansion(X)
           AND NOT isBugCondition_InconsistentTranslation(X) DO
  ASSERT F(X) = F'(X)
END FOR
```
