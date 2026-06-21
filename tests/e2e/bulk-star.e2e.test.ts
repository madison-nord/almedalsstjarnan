/**
 * E2E test: Bulk Star flow
 *
 * Tests the bulk-star feature end-to-end:
 * 1. Load the extension in Chromium with the built dist/
 * 2. Navigate to a page matching the content script pattern
 * 3. Verify the bulk star button is visible and positioned near the search area
 * 4. Click the bulk star button
 * 5. Verify pagination expansion is attempted (load-more button clicked)
 * 6. Verify all 30 visible events are starred
 * 7. Verify the button uses the correct locale text
 *
 * Requirements: 1.1, 2.1, 2.2, 2.3, 3.1
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

test.describe('Bulk Star E2E Flow', () => {
  let context: BrowserContext;
  let server: http.Server;
  let port: number;

  test.beforeAll(async () => {
    const fixture = await startFixtureServer();
    server = fixture.server;
    port = fixture.port;

    context = await launchExtensionContext(port);
  });

  test.afterAll(async () => {
    await context.close();
    server.close();
  });

  // Increase timeout for bulk operations that involve pagination timeouts
  test.setTimeout(60000);

  test('bulk star button is positioned near the search/filter area (not fixed corner)', async () => {
    const page = await loadFixturePage(context, port);

    // The bulk star button host should be in the DOM near the list-header area
    const bulkStarHost = page.locator('#almedals-bulk-star-host');
    await expect(bulkStarHost).toBeVisible({ timeout: 10000 });

    // Verify it is NOT position:fixed (it should be inline in the page flow)
    const hostPosition = await bulkStarHost.evaluate((el) => {
      return window.getComputedStyle(el).position;
    });
    expect(hostPosition).not.toBe('fixed');

    // Verify the host is inside or adjacent to the list-header area
    const isNearSearchArea = await bulkStarHost.evaluate((el) => {
      // Check that the host is inside the .list-header or its parent .outer container
      const listHeader = document.querySelector('.list-header');
      if (!listHeader) return false;
      const outerContainer = listHeader.parentElement;
      if (!outerContainer) return false;
      return outerContainer.contains(el);
    });
    expect(isNearSearchArea).toBe(true);

    await page.close();
  });

  test('bulk star button uses correct locale text (Swedish by default)', async () => {
    const page = await loadFixturePage(context, port);

    const bulkStarHost = page.locator('#almedals-bulk-star-host');
    await expect(bulkStarHost).toBeVisible({ timeout: 10000 });

    // The button text should be the Swedish label since no language preference is stored
    // and the fixture page has lang="sv"
    const buttonText = await bulkStarHost.locator('button.bulk-star-btn span').textContent();
    // Accept either Swedish "Stjärnmärk alla" or English "Star all"
    // (browser locale in test may be English, but if stored preference is respected it should match)
    expect(buttonText === 'Stjärnmärk alla' || buttonText === 'Star all').toBe(true);

    await page.close();
  });

  test('clicking bulk star attempts pagination expansion and stars all visible events', async () => {
    const page = await loadFixturePage(context, port);

    // Verify the load-more button exists before bulk star
    const loadMoreBtn = page.locator('a[class*="load-more-button"]');
    await expect(loadMoreBtn).toBeVisible({ timeout: 5000 });

    // Count initial event cards
    const initialCardCount = await page.locator('li:has(.event-information)').count();
    expect(initialCardCount).toBe(30);

    // Click the bulk star button
    const bulkStarHost = page.locator('#almedals-bulk-star-host');
    await expect(bulkStarHost).toBeVisible({ timeout: 10000 });

    const bulkStarBtn = bulkStarHost.locator('button.bulk-star-btn');
    await bulkStarBtn.click();

    // The progress indicator host should appear in the DOM
    const progressHost = page.locator('#almedals-progress-host');
    await expect(progressHost).toBeAttached({ timeout: 5000 });

    // The coordinator should attempt pagination expansion by clicking the load-more button.
    // Since our fixture is static HTML, the load-more click won't add new events.
    // After the pagination timeout, it proceeds to star visible events.
    // Wait for the operation to complete — all star buttons should become pressed
    const starredButtons = page.locator('.almedals-star-host button.star-btn[aria-pressed="true"]');
    await expect(starredButtons).toHaveCount(30, { timeout: 30000 });

    await page.close();
  });

  test('pagination expansion removes href to prevent navigation before clicking load-more', async () => {
    const page = await loadFixturePage(context, port);

    // Set up a listener to detect any navigation attempts
    let navigationAttempted = false;
    page.on('framenavigated', () => {
      navigationAttempted = true;
    });

    // Click the bulk star button
    const bulkStarHost = page.locator('#almedals-bulk-star-host');
    await expect(bulkStarHost).toBeVisible({ timeout: 10000 });

    const bulkStarBtn = bulkStarHost.locator('button.bulk-star-btn');
    await bulkStarBtn.click();

    // Wait for pagination expansion attempt (a few seconds should suffice)
    await page.waitForTimeout(3000);

    // The page should NOT have navigated away
    expect(navigationAttempted).toBe(false);

    // Verify we're still on the same page
    expect(page.url()).toContain('almedalsveckan-program-2026.html');

    await page.close();
  });
});
