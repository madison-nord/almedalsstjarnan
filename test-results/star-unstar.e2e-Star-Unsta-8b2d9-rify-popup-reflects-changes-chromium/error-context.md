# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: star-unstar.e2e.test.ts >> Star/Unstar E2E Flow >> star and unstar an event card, verify popup reflects changes
- Location: tests\e2e\star-unstar.e2e.test.ts:118:3

# Error details

```
Error: browserType.launchPersistentContext: Executable doesn't exist at C:\Users\noctu\AppData\Local\ms-playwright\chromium-1217\chrome-win64\chrome.exe
╔════════════════════════════════════════════════════════════╗
║ Looks like Playwright was just installed or updated.       ║
║ Please run the following command to download new browsers: ║
║                                                            ║
║     pnpm exec playwright install                           ║
║                                                            ║
║ <3 Playwright Team                                         ║
╚════════════════════════════════════════════════════════════╝
```

```
TypeError: Cannot read properties of undefined (reading 'close')
```

# Test source

```ts
  15  |  * In CI, use xvfb-run or a similar virtual display server.
  16  |  */
  17  | 
  18  | import { test, expect, chromium, type BrowserContext, type Page } from '@playwright/test';
  19  | import path from 'node:path';
  20  | import { fileURLToPath } from 'node:url';
  21  | 
  22  | const __dirname = path.dirname(fileURLToPath(import.meta.url));
  23  | const EXTENSION_PATH = path.resolve(__dirname, '../../dist');
  24  | const FIXTURE_PATH = path.resolve(__dirname, '../../fixtures/almedalsveckan-program-2026.html');
  25  | 
  26  | // ─── Helpers ──────────────────────────────────────────────────────
  27  | 
  28  | /**
  29  |  * Launches a persistent Chromium context with the extension loaded.
  30  |  * Extensions require a persistent context and non-headless mode.
  31  |  */
  32  | async function launchExtensionContext(): Promise<BrowserContext> {
  33  |   return chromium.launchPersistentContext('', {
  34  |     headless: false,
  35  |     args: [
  36  |       `--disable-extensions-except=${EXTENSION_PATH}`,
  37  |       `--load-extension=${EXTENSION_PATH}`,
  38  |       '--no-first-run',
  39  |       '--disable-default-apps',
  40  |     ],
  41  |   });
  42  | }
  43  | 
  44  | /**
  45  |  * Retrieves the extension ID from the loaded extensions by inspecting
  46  |  * the service worker URL registered by the extension.
  47  |  */
  48  | async function getExtensionId(context: BrowserContext): Promise<string> {
  49  |   // Wait for the service worker to be registered
  50  |   let serviceWorker = context.serviceWorkers()[0];
  51  |   if (!serviceWorker) {
  52  |     serviceWorker = await context.waitForEvent('serviceworker');
  53  |   }
  54  |   const url = serviceWorker.url();
  55  |   // chrome-extension://<id>/background.js
  56  |   const match = url.match(/chrome-extension:\/\/([^/]+)\//);
  57  |   if (!match?.[1]) {
  58  |     throw new Error(`Could not extract extension ID from service worker URL: ${url}`);
  59  |   }
  60  |   return match[1];
  61  | }
  62  | 
  63  | /**
  64  |  * Opens the extension popup in a new tab.
  65  |  * Since Playwright cannot directly open the popup panel, we navigate
  66  |  * to the popup HTML URL as a regular page.
  67  |  */
  68  | async function openPopupPage(context: BrowserContext, extensionId: string): Promise<Page> {
  69  |   const popupPage = await context.newPage();
  70  |   await popupPage.goto(`chrome-extension://${extensionId}/src/ui/popup/popup.html`);
  71  |   await popupPage.waitForLoadState('domcontentloaded');
  72  |   return popupPage;
  73  | }
  74  | 
  75  | /**
  76  |  * Navigates to the fixture page served as a file URL.
  77  |  *
  78  |  * Because the content script only matches *://almedalsveckan.info/*,
  79  |  * it will NOT auto-inject on a file:// URL. We manually inject the
  80  |  * built content script to simulate the extension behavior.
  81  |  */
  82  | async function loadFixturePage(context: BrowserContext, extensionId: string): Promise<Page> {
  83  |   const page = await context.newPage();
  84  |   await page.goto(`file://${FIXTURE_PATH}`);
  85  |   await page.waitForLoadState('domcontentloaded');
  86  | 
  87  |   // Inject the built content script manually since file:// doesn't match
  88  |   // the manifest's content_scripts match pattern.
  89  |   // The content script auto-initializes when chrome.runtime.id is available,
  90  |   // but on file:// pages the extension context may not be present.
  91  |   // We add the script from the extension's own URL to ensure it runs
  92  |   // in the extension's content script context.
  93  |   await page.addScriptTag({
  94  |     url: `chrome-extension://${extensionId}/content-script.js`,
  95  |   });
  96  | 
  97  |   // Allow time for the content script to process event cards
  98  |   await page.waitForTimeout(1000);
  99  | 
  100 |   return page;
  101 | }
  102 | 
  103 | // ─── Tests ────────────────────────────────────────────────────────
  104 | 
  105 | test.describe('Star/Unstar E2E Flow', () => {
  106 |   let context: BrowserContext;
  107 |   let extensionId: string;
  108 | 
  109 |   test.beforeAll(async () => {
  110 |     context = await launchExtensionContext();
  111 |     extensionId = await getExtensionId(context);
  112 |   });
  113 | 
  114 |   test.afterAll(async () => {
> 115 |     await context.close();
      |                   ^ TypeError: Cannot read properties of undefined (reading 'close')
  116 |   });
  117 | 
  118 |   test('star and unstar an event card, verify popup reflects changes', async () => {
  119 |     // Step 1: Load the fixture page with the extension's content script
  120 |     const page = await loadFixturePage(context, extensionId);
  121 | 
  122 |     // Step 2: Find the first event card with an injected star button host
  123 |     const starHost = page.locator('.almedals-star-host').first();
  124 |     await expect(starHost).toBeVisible({ timeout: 5000 });
  125 | 
  126 |     // The star button lives inside Shadow DOM — pierce into it
  127 |     const starButton = starHost.locator('button.star-btn');
  128 | 
  129 |     // Step 3: Verify initial state is unstarred (aria-pressed="false")
  130 |     await expect(starButton).toHaveAttribute('aria-pressed', 'false');
  131 | 
  132 |     // Step 4: Click to star the event
  133 |     await starButton.click();
  134 | 
  135 |     // Step 5: Verify button switches to filled/starred state
  136 |     await expect(starButton).toHaveAttribute('aria-pressed', 'true', { timeout: 3000 });
  137 | 
  138 |     // Step 6: Open the popup and verify the event appears in the list
  139 |     const popupPage = await openPopupPage(context, extensionId);
  140 | 
  141 |     // The popup should show at least one event item
  142 |     // EventList renders event items — look for any list content
  143 |     const eventItems = popupPage.locator('ul li, [class*="event"]');
  144 |     await expect(eventItems.first()).toBeVisible({ timeout: 5000 });
  145 | 
  146 |     // Step 7: Go back to the fixture page and unstar the event
  147 |     await popupPage.close();
  148 |     await starButton.click();
  149 | 
  150 |     // Step 8: Verify button switches back to outlined/unstarred state
  151 |     await expect(starButton).toHaveAttribute('aria-pressed', 'false', { timeout: 3000 });
  152 | 
  153 |     // Step 9: Open popup again and verify the event is gone
  154 |     const popupPage2 = await openPopupPage(context, extensionId);
  155 | 
  156 |     // The popup should now show the empty state
  157 |     // EmptyState component renders when events.length === 0
  158 |     // Look for the empty state heading or the absence of event items
  159 |     const emptyState = popupPage2.getByText(/stjärnmärk|star/i);
  160 |     await expect(emptyState).toBeVisible({ timeout: 5000 });
  161 | 
  162 |     await popupPage2.close();
  163 |     await page.close();
  164 |   });
  165 | 
  166 |   test('star button has correct accessibility attributes', async () => {
  167 |     const page = await loadFixturePage(context, extensionId);
  168 | 
  169 |     const starHost = page.locator('.almedals-star-host').first();
  170 |     await expect(starHost).toBeVisible({ timeout: 5000 });
  171 | 
  172 |     const starButton = starHost.locator('button.star-btn');
  173 | 
  174 |     // Verify button type
  175 |     await expect(starButton).toHaveAttribute('type', 'button');
  176 | 
  177 |     // Verify aria-pressed is present
  178 |     const ariaPressed = await starButton.getAttribute('aria-pressed');
  179 |     expect(ariaPressed === 'true' || ariaPressed === 'false').toBe(true);
  180 | 
  181 |     // Verify aria-label is present and non-empty
  182 |     const ariaLabel = await starButton.getAttribute('aria-label');
  183 |     expect(ariaLabel).toBeTruthy();
  184 |     expect(typeof ariaLabel === 'string' && ariaLabel.length > 0).toBe(true);
  185 | 
  186 |     // Verify the button is keyboard-focusable
  187 |     await starButton.focus();
  188 |     await expect(starButton).toBeFocused();
  189 | 
  190 |     await page.close();
  191 |   });
  192 | 
  193 |   test('starring persists across page reload', async () => {
  194 |     const page = await loadFixturePage(context, extensionId);
  195 | 
  196 |     const starHost = page.locator('.almedals-star-host').first();
  197 |     await expect(starHost).toBeVisible({ timeout: 5000 });
  198 | 
  199 |     const starButton = starHost.locator('button.star-btn');
  200 | 
  201 |     // Star the event
  202 |     await starButton.click();
  203 |     await expect(starButton).toHaveAttribute('aria-pressed', 'true', { timeout: 3000 });
  204 | 
  205 |     // Reload the page and re-inject the content script
  206 |     await page.reload();
  207 |     await page.waitForLoadState('domcontentloaded');
  208 |     await page.addScriptTag({
  209 |       url: `chrome-extension://${extensionId}/content-script.js`,
  210 |     });
  211 |     await page.waitForTimeout(1000);
  212 | 
  213 |     // The same event card's star button should still be starred
  214 |     const starHostAfterReload = page.locator('.almedals-star-host').first();
  215 |     await expect(starHostAfterReload).toBeVisible({ timeout: 5000 });
```