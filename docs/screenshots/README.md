# Screenshots

This directory holds screenshots used in the repository README and Chrome Web Store listing.

## Required Screenshots

| Screenshot | Description | Suggested Width |
|---|---|---|
| `star-button.png` | Star button injected on almedalsveckan.info event cards (content script) | 1280px |
| `popup-ui.png` | Popup UI showing a list of starred events | 400px |
| `stars-page.png` | Full-page stars view with grid layout, search bar, and sort controls | 1280px |

## Capture Guidelines

- **Resolution**: Use a display scaled at 2× (retina) so images remain crisp on high-DPI screens.
- **Full-page captures** (star button, stars page): 1280px wide viewport.
- **Popup capture**: 400px wide viewport matching the Chrome popup width.
- **Format**: PNG for lossless quality. Optimize with a tool like `pngquant` before committing.
- **Naming**: Use the filenames listed in the table above so README image references resolve correctly.

## Automated Capture

The script at `scripts/capture-store-screenshots.ts` can be used to generate screenshots programmatically via Playwright. Run it with:

```bash
pnpm tsx scripts/capture-store-screenshots.ts
```

## Usage in README

The root README references these images with relative paths:

```markdown
![Star button on almedalsveckan.info](docs/screenshots/star-button.png)
![Popup UI](docs/screenshots/popup-ui.png)
![Stars page](docs/screenshots/stars-page.png)
```
