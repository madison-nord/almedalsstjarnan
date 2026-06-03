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
import http from 'node:http';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = path.resolve(__dirname, '../../dist');
const FIXTURE_DIR = path.resolve(__dirname, '../../fixtures');

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Starts a simple HTTP server serving the fixtures directory.
 * Returns the server instance and the port it's listening on.
 */
async function startFixtureServer(): Promise<{ server: http.Server; port: number }> {
  const server = http.createServer((req, res) => {
    const requestPath = new URL(req.url ?? '/', 'http://127.0.0.1').pathname;
    const relativePath =
      requestPath === '/' ? 'almedalsveckan-program-2026.html' : requestPath.replace(/^\/+/, '');
    const filePath = path.resolve(FIXTURE_DIR, relativePath);
    const relativeToFixtureDir = path.relative(FIXTURE_DIR, filePath);

    if (relativeToFixtureDir.startsWith('..') || path.isAbsolute(relativeToFixtureDir)) {
      // Return empty 200 for invalid traversal attempts to preserve test-server behavior
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('');
      return;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(content);
    } catch {
      // Return empty 200 for missing resources (CSS/JS referenced in the fixture HTML)
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('');
    }
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as { port: number };
      resolve({ server, port: addr.port });
    });
  });
}

/**
 * Launches a persistent Chromium context with the extension loaded.
 * Uses host-resolver-rules to redirect almedalsveckan.info to localhost.
 */
async function launchExtensionContext(port: number): Promise<BrowserContext> {
  return chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      `--host-resolver-rules=MAP almedalsveckan.info 127.0.0.1:${port}`,
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
 * Navigates to the fixture page via the almedalsveckan.info domain
 * (resolved to localhost). The content script auto-injects because
 * the URL matches the manifest's content_scripts match pattern.
 */
async function loadFixturePage(context: BrowserContext, port: number): Promise<Page> {
  const page = await context.newPage();
  await page.goto(`http://almedalsveckan.info:${port}/almedalsveckan-program-2026.html`);
  await page.waitForLoadState('domcontentloaded');

  // Allow time for the content script to process event cards
  await page.waitForTimeout(2000);

  return page;
}

// ─── Tests ────────────────────────────────────────────────────────

test.describe('Star/Unstar E2E Flow', () => {
  let context: BrowserContext;
  let extensionId: string;
  let server: http.Server;
  let port: number;

  test.beforeAll(async () => {
    const fixture = await startFixtureServer();
    server = fixture.server;
    port = fixture.port;

    context = await launchExtensionContext(port);
    extensionId = await getExtensionId(context);
  });

  test.afterAll(async () => {
    await context.close();
    server.close();
  });

  test('star and unstar an event card, verify popup reflects changes', async () => {
    // Step 1: Load the fixture page with the extension's content script
    const page = await loadFixturePage(context, port);

    // Step 2: Find the first event card with an injected star button host
    const starHost = page.locator('.almedals-star-host').first();
    await expect(starHost).toBeVisible({ timeout: 10000 });

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

    // The popup should now show the empty state heading
    const emptyState = popupPage2.getByRole('heading', {
      name: /No starred events|Inga stjärnmärkta/i,
    });
    await expect(emptyState).toBeVisible({ timeout: 5000 });

    await popupPage2.close();
    await page.close();
  });

  test('star button has correct accessibility attributes', async () => {
    const page = await loadFixturePage(context, port);

    const starHost = page.locator('.almedals-star-host').first();
    await expect(starHost).toBeVisible({ timeout: 10000 });

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
    const page = await loadFixturePage(context, port);

    const starHost = page.locator('.almedals-star-host').first();
    await expect(starHost).toBeVisible({ timeout: 10000 });

    const starButton = starHost.locator('button.star-btn');

    // Star the event
    await starButton.click();
    await expect(starButton).toHaveAttribute('aria-pressed', 'true', { timeout: 3000 });

    // Reload the page — content script re-injects automatically
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // The same event card's star button should still be starred
    const starHostAfterReload = page.locator('.almedals-star-host').first();
    await expect(starHostAfterReload).toBeVisible({ timeout: 10000 });

    const starButtonAfterReload = starHostAfterReload.locator('button.star-btn');
    await expect(starButtonAfterReload).toHaveAttribute('aria-pressed', 'true', { timeout: 3000 });

    // Clean up: unstar the event
    await starButtonAfterReload.click();
    await expect(starButtonAfterReload).toHaveAttribute('aria-pressed', 'false', { timeout: 3000 });

    await page.close();
  });
});
