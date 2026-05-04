/**
 * E2E test: Star/Unstar flow
 *
 * Tests the critical star/unstar user journey end-to-end:
 * 1. Load the extension in Chromium with the built dist/
 * 2. Navigate to a page matching the content script pattern
 * 3. Click a star button on an event card → verify filled state
 * 4. Click again to unstar → verify outlined state
 * 5. Open the popup → verify event appears when starred
 * 6. Verify event disappears when unstarred
 *
 * Requirements: 18.4
 *
 * NOTE: Chrome extensions require headless: false (non-headless Chromium).
 * In CI, use xvfb-run or a similar virtual display server.
 */

import { test, expect, chromium, type BrowserContext, type Page } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = path.resolve(__dirname, '../../dist');
const FIXTURE_PATH = path.resolve(__dirname, '../../fixtures/almedalsveckan-program-2026.html');

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Launches a persistent Chromium context with the extension loaded.
 * Extensions require a persistent context and non-headless mode.
 */
async function launchExtensionContext(): Promise<BrowserContext> {
  return chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-first-run',
      '--disable-default-apps',
    ],
  });
}

/**
 * Retrieves the extension ID from the loaded extensions by inspecting
 * the service worker URL registered by the extension.
 */
async function getExtensionId(context: BrowserContext): Promise<string> {
  // Wait for the service worker to be registered
  let serviceWorker = context.serviceWorkers()[0];
  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent('serviceworker');
  }
  const url = serviceWorker.url();
  // chrome-extension://<id>/background.js
  const match = url.match(/chrome-extension:\/\/([^/]+)\//);
  if (!match?.[1]) {
    throw new Error(`Could not extract extension ID from service worker URL: ${url}`);
  }
  return match[1];
}

/**
 * Opens the extension popup in a new tab.
 * Since Playwright cannot directly open the popup panel, we navigate
 * to the popup HTML URL as a regular page.
 */
async function openPopupPage(context: BrowserContext, extensionId: string): Promise<Page> {
  const popupPage = await context.newPage();
  await popupPage.goto(`chrome-extension://${extensionId}/src/ui/popup/popup.html`);
  await popupPage.waitForLoadState('domcontentloaded');
  return popupPage;
}

/**
 * Navigates to the fixture page served as a file URL.
 *
 * Because the content script only matches *://almedalsveckan.info/*,
 * it will NOT auto-inject on a file:// URL. We manually inject the
 * built content script to simulate the extension behavior.
 */
async function loadFixturePage(context: BrowserContext, extensionId: string): Promise<Page> {
  const page = await context.newPage();
  await page.goto(`file://${FIXTURE_PATH}`);
  await page.waitForLoadState('domcontentloaded');

  // Inject the built content script manually since file:// doesn't match
  // the manifest's content_scripts match pattern.
  // The content script auto-initializes when chrome.runtime.id is available,
  // but on file:// pages the extension context may not be present.
  // We add the script from the extension's own URL to ensure it runs
  // in the extension's content script context.
  await page.addScriptTag({
    url: `chrome-extension://${extensionId}/content-script.js`,
  });

  // Allow time for the content script to process event cards
  await page.waitForTimeout(1000);

  return page;
}

// ─── Tests ────────────────────────────────────────────────────────

test.describe('Star/Unstar E2E Flow', () => {
  let context: BrowserContext;
  let extensionId: string;

  test.beforeAll(async () => {
    context = await launchExtensionContext();
    extensionId = await getExtensionId(context);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('star and unstar an event card, verify popup reflects changes', async () => {
    // Step 1: Load the fixture page with the extension's content script
    const page = await loadFixturePage(context, extensionId);

    // Step 2: Find the first event card with an injected star button host
    const starHost = page.locator('.almedals-star-host').first();
    await expect(starHost).toBeVisible({ timeout: 5000 });

    // The star button lives inside Shadow DOM — pierce into it
    const starButton = starHost.locator('button.star-btn');

    // Step 3: Verify initial state is unstarred (aria-pressed="false")
    await expect(starButton).toHaveAttribute('aria-pressed', 'false');

    // Step 4: Click to star the event
    await starButton.click();

    // Step 5: Verify button switches to filled/starred state
    await expect(starButton).toHaveAttribute('aria-pressed', 'true', { timeout: 3000 });

    // Step 6: Open the popup and verify the event appears in the list
    const popupPage = await openPopupPage(context, extensionId);

    // The popup should show at least one event item
    // EventList renders event items — look for any list content
    const eventItems = popupPage.locator('ul li, [class*="event"]');
    await expect(eventItems.first()).toBeVisible({ timeout: 5000 });

    // Step 7: Go back to the fixture page and unstar the event
    await popupPage.close();
    await starButton.click();

    // Step 8: Verify button switches back to outlined/unstarred state
    await expect(starButton).toHaveAttribute('aria-pressed', 'false', { timeout: 3000 });

    // Step 9: Open popup again and verify the event is gone
    const popupPage2 = await openPopupPage(context, extensionId);

    // The popup should now show the empty state
    // EmptyState component renders when events.length === 0
    // Look for the empty state heading or the absence of event items
    const emptyState = popupPage2.getByText(/stjärnmärk|star/i);
    await expect(emptyState).toBeVisible({ timeout: 5000 });

    await popupPage2.close();
    await page.close();
  });

  test('star button has correct accessibility attributes', async () => {
    const page = await loadFixturePage(context, extensionId);

    const starHost = page.locator('.almedals-star-host').first();
    await expect(starHost).toBeVisible({ timeout: 5000 });

    const starButton = starHost.locator('button.star-btn');

    // Verify button type
    await expect(starButton).toHaveAttribute('type', 'button');

    // Verify aria-pressed is present
    const ariaPressed = await starButton.getAttribute('aria-pressed');
    expect(ariaPressed === 'true' || ariaPressed === 'false').toBe(true);

    // Verify aria-label is present and non-empty
    const ariaLabel = await starButton.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
    expect(typeof ariaLabel === 'string' && ariaLabel.length > 0).toBe(true);

    // Verify the button is keyboard-focusable
    await starButton.focus();
    await expect(starButton).toBeFocused();

    await page.close();
  });

  test('starring persists across page reload', async () => {
    const page = await loadFixturePage(context, extensionId);

    const starHost = page.locator('.almedals-star-host').first();
    await expect(starHost).toBeVisible({ timeout: 5000 });

    const starButton = starHost.locator('button.star-btn');

    // Star the event
    await starButton.click();
    await expect(starButton).toHaveAttribute('aria-pressed', 'true', { timeout: 3000 });

    // Reload the page and re-inject the content script
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.addScriptTag({
      url: `chrome-extension://${extensionId}/content-script.js`,
    });
    await page.waitForTimeout(1000);

    // The same event card's star button should still be starred
    const starHostAfterReload = page.locator('.almedals-star-host').first();
    await expect(starHostAfterReload).toBeVisible({ timeout: 5000 });

    const starButtonAfterReload = starHostAfterReload.locator('button.star-btn');
    await expect(starButtonAfterReload).toHaveAttribute('aria-pressed', 'true', { timeout: 3000 });

    // Clean up: unstar the event
    await starButtonAfterReload.click();
    await expect(starButtonAfterReload).toHaveAttribute('aria-pressed', 'false', { timeout: 3000 });

    await page.close();
  });
});
