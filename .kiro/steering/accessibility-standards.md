---
inclusion: fileMatch
fileMatchPattern: 'src/ui/**'
---

# Accessibility Standards

## Baseline

WCAG 2.1 AA compliance for all extension UI surfaces.

## Keyboard Navigation

- All interactive elements must be reachable via Tab key.
- Buttons must activate on both Enter and Space key presses.
- Use `Shift+Tab` for reverse navigation.
- Popup UI and Stars Page must be fully keyboard-navigable.

## Star Button

- Use `aria-pressed` attribute to reflect starred state (`"true"` when starred, `"false"` when unstarred).
- Use `aria-label` with localized text: `getMessage('starEvent')` when unstarred, `getMessage('unstarEvent')` when starred.
- Minimum 32px clickable area with 16px icon inside.
- Focus-visible outline: `2px solid #2563eb` with `2px` offset.
- Must be focusable via keyboard Tab navigation within the Shadow DOM.

## Sort Selector

- Use native HTML `<select>` element — inherits keyboard behavior and ARIA semantics automatically.
- Add `aria-label` from the localized `sortLabel` message key.

## Contrast

- All text and interactive elements must meet 4.5:1 contrast ratio for normal text.
- Large text (18px+ or 14px+ bold) must meet 3:1 contrast ratio.
- Star button colors: filled `#f59e0b` on white meets contrast requirements; outlined `#6b7280` on white meets requirements.

## Focus Indicators

- Visible focus outline on all interactive elements.
- Minimum 2px outline width.
- Use `focus-visible` pseudo-class to show outlines only for keyboard navigation.

## Empty States

- Use appropriate heading level (`h2` or `h3`).
- Provide instructional text explaining how to star events.

## Links

- Title cells in the Stars Page grid should be `<a>` elements opening `sourceUrl` in a new tab.
- Use descriptive link text (the event title itself).
- Add `target="_blank"` with `rel="noopener noreferrer"`.
