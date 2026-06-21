# Chrome Web Store Listing Assets

This directory contains documentation and assets for the Almedalsstjärnan Chrome Web Store listing.

## Store Category

**Category:** Productivity

## Required Assets

### Screenshots (required — at least one)

- **Dimensions:** 1280×800 px or 640×400 px
- **Content:** Each screenshot must depict the extension in active use on the almedalsveckan.info programme page (e.g., star buttons visible, popup open with starred events).
- **Format:** PNG or JPEG
- **Placement:** Place screenshot files in this directory with descriptive names (e.g., `screenshot-star-button.png`).

### Store Description

- Swedish: [`description-sv.md`](./description-sv.md)
- English: [`description-en.md`](./description-en.md)

### Permission Justifications

See [`permission-justifications.md`](./permission-justifications.md) for per-permission justifications and the single-purpose description.

## Optional Assets

### Small Promotional Tile (recommended)

- **Dimensions:** 440×280 px
- **Format:** PNG or JPEG
- **Usage:** Displayed in Chrome Web Store search results and category pages.
- **Placement:** Save as `promo-tile-440x280.png` in this directory.

## Hosting the Privacy Policy

The Chrome Web Store requires a publicly accessible URL for the privacy policy. The source file is [`PRIVACY.md`](../PRIVACY.md) in the repository root.

**Active Privacy Policy URL:**

```
https://madison-nord.github.io/almedalsstjarnan/PRIVACY
```

This is the live URL deployed via GitHub Pages. Use this URL in the Chrome Web Store developer dashboard under "Privacy policy URL".

### Option 1: GitHub Pages

1. Enable GitHub Pages in the repository settings (Settings → Pages).
2. Set the source branch (e.g., `main`) and root folder (`/`).
3. The privacy policy will be available at:
   ```
   https://madison-nord.github.io/almedalsstjarnan/PRIVACY
   ```
4. Enter this URL in the Chrome Web Store developer dashboard under "Privacy policy URL".

### Option 2: Raw GitHub File Link

Use the raw file URL directly:

```
https://raw.githubusercontent.com/madison-nord/almedalsstjarnan/main/PRIVACY.md
```

This renders as plain Markdown but satisfies the Chrome Web Store requirement for a publicly accessible privacy policy URL.

### Recommendation

GitHub Pages is preferred because it renders the Markdown as a formatted HTML page, providing a better experience for reviewers and users.

## Generating Screenshots

Run the screenshot script to automatically capture store-ready screenshots:

```bash
pnpm tsx scripts/capture-store-screenshots.ts
```

This builds the extension, loads it in Chromium via Playwright, navigates to the fixture page (or live site), and captures screenshots at the required 1280×800 dimensions. Output is saved to the `store/` directory.
