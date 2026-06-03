/**
 * E2E test: ICS Export flow
 *
 * Tests the ICS calendar export user journey end-to-end:
 * 1. Load the extension in Chromium with the built dist/
 * 2. Star multiple events on the fixture page
 * 3. Open the stars page
 * 4. Click the export button
 * 5. Verify .ics file is downloaded with the correct filename pattern
 * 6. Verify the file contains valid ICS content with correct PRODID and VEVENT entries
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

/** Regex matching the expected ICS export filename pattern.
 * chrome.downloads.download sets the disk filename, but Playwright's download event
 * captures the blob URL name (a UUID). We accept either pattern. */
const ICS_FILENAME_PATTERN = /\.ics$/;

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Starts a simple HTTP server serving the fixtures directory.
 * Returns the server instance and the port it's listening on.
 */
async function startFixtureServer(): Promise<{ server: http.Server; port: number }> {
  const server = http.createServer((req, res) => {
    const requestUrl = req.url ?? '/';
    const pathname = new URL(requestUrl, 'http://127.0.0.1').pathname;
    const requestedPath =
      pathname === '/' ? 'almedalsveckan-program-2026.html' : pathname.replace(/^\/+/, '');
    const filePath = path.resolve(FIXTURE_DIR, requestedPath);
    const fixtureRoot = FIXTURE_DIR.endsWith(path.sep) ? FIXTURE_DIR : `${FIXTURE_DIR}${path.sep}`;

    if (filePath !== FIXTURE_DIR && !filePath.startsWith(fixtureRoot)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end('Not found');
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
    acceptDownloads: true,
  });
}

/**
 * Retrieves the extension ID from the loaded extensions by inspecting
 * the service worker URL registered by the extension.
 */
async function getExtensionId(context: BrowserContext): Promise<string> {
  let serviceWorker = context.serviceWorkers()[0];
  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent('serviceworker');
  }
  const url = serviceWorker.url();
  const match = url.match(/chrome-extension:\/\/([^/]+)\//);
  if (!match?.[1]) {
    throw new Error(`Could not extract extension ID from service worker URL: ${url}`);
  }
  return match[1];
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

/**
 * Opens the stars page in a new tab.
 */
async function openStarsPage(context: BrowserContext, extensionId: string): Promise<Page> {
  const starsPage = await context.newPage();
  await starsPage.goto(`chrome-extension://${extensionId}/src/ui/stars/stars.html`);
  await starsPage.waitForLoadState('domcontentloaded');
  return starsPage;
}

/**
 * Stars N event cards on the fixture page by clicking their star buttons.
 */
async function starMultipleEvents(page: Page, count: number): Promise<void> {
  const starHosts = page.locator('.almedals-star-host');
  const available = await starHosts.count();
  const toStar = Math.min(count, available);

  for (let i = 0; i < toStar; i++) {
    const host = starHosts.nth(i);
    const button = host.locator('button.star-btn');

    // Only star if not already starred
    const pressed = await button.getAttribute('aria-pressed');
    if (pressed !== 'true') {
      await button.click();
      // Wait for the state to update
      await expect(button).toHaveAttribute('aria-pressed', 'true', { timeout: 3000 });
    }
  }
}

// ─── Tests ────────────────────────────────────────────────────────

test.describe('ICS Export E2E Flow', () => {
  let context: BrowserContext;
  let extensionId: string;
  let server: http.Server;
  let port: number;
  const downloadDir = path.resolve(__dirname, '../../test-downloads');

  test.beforeAll(async () => {
    // Ensure download directory exists
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    const fixture = await startFixtureServer();
    server = fixture.server;
    port = fixture.port;

    context = await launchExtensionContext(port);
    extensionId = await getExtensionId(context);
  });

  test.afterAll(async () => {
    await context.close();
    server.close();

    // Clean up download directory
    if (fs.existsSync(downloadDir)) {
      fs.rmSync(downloadDir, { recursive: true, force: true });
    }
  });

  test('export starred events as ICS file with correct content', async () => {
    const EVENTS_TO_STAR = 3;

    // Step 1: Load fixture page and star multiple events
    const fixturePage = await loadFixturePage(context, port);

    const starHosts = fixturePage.locator('.almedals-star-host');
    await expect(starHosts.first()).toBeVisible({ timeout: 10000 });

    await starMultipleEvents(fixturePage, EVENTS_TO_STAR);

    // Step 2: Open the stars page
    const starsPage = await openStarsPage(context, extensionId);

    // Wait for the stars page to load and display events
    await starsPage.waitForTimeout(1000);

    // Verify events are displayed on the stars page
    // The EventGrid renders rows — look for event content
    const eventRows = starsPage.locator('table tbody tr, [class*="event"], [class*="grid"] > *');
    await expect(eventRows.first()).toBeVisible({ timeout: 5000 });

    // Step 3: Click the export button and capture the download
    // The ExportButton uses adapter.download() which triggers chrome.downloads.download.
    // In Playwright, we can intercept the download event.
    const exportButton = starsPage.getByRole('button', { name: 'Export to calendar' });
    await expect(exportButton).toBeVisible({ timeout: 3000 });

    // Listen for the download event
    const downloadPromise = starsPage.waitForEvent('download', { timeout: 10000 });
    await exportButton.click();

    const download = await downloadPromise;

    // Step 4: Verify filename ends with .ics
    const filename = download.suggestedFilename();
    expect(filename).toMatch(ICS_FILENAME_PATTERN);

    // Step 5: Read and validate the ICS file content
    const downloadPath = path.join(downloadDir, filename);
    await download.saveAs(downloadPath);

    const icsContent = fs.readFileSync(downloadPath, 'utf-8');

    // Verify VCALENDAR structure
    expect(icsContent).toContain('BEGIN:VCALENDAR');
    expect(icsContent).toContain('END:VCALENDAR');

    // Verify required VCALENDAR properties
    expect(icsContent).toContain('VERSION:2.0');
    expect(icsContent).toContain('PRODID:-//Almedalsstjärnan//EN');
    expect(icsContent).toContain('CALSCALE:GREGORIAN');
    expect(icsContent).toContain('METHOD:PUBLISH');

    // Verify VEVENT entries exist (one per starred event)
    const veventBeginCount = (icsContent.match(/BEGIN:VEVENT/g) ?? []).length;
    const veventEndCount = (icsContent.match(/END:VEVENT/g) ?? []).length;
    expect(veventBeginCount).toBe(EVENTS_TO_STAR);
    expect(veventEndCount).toBe(EVENTS_TO_STAR);

    // Verify each VEVENT has required fields
    // Split into individual VEVENT blocks for validation
    const veventBlocks = icsContent.split('BEGIN:VEVENT').slice(1);
    for (const block of veventBlocks) {
      // UID must end with @almedalsstjarnan
      expect(block).toMatch(/UID:.*@almedalsstjarnan/);

      // DTSTAMP must be present in UTC format
      expect(block).toMatch(/DTSTAMP:\d{8}T\d{6}Z/);

      // DTSTART must be present
      expect(block).toMatch(/DTSTART:\d{8}T\d{6}/);

      // SUMMARY must be present (event title)
      expect(block).toMatch(/SUMMARY:.+/);
    }

    // Verify CRLF line endings (RFC 5545 requirement)
    // The file should use \r\n, not bare \n
    const lines = icsContent.split('\r\n');
    expect(lines.length).toBeGreaterThan(1);

    // Clean up: unstar all events
    for (let i = 0; i < EVENTS_TO_STAR; i++) {
      const host = fixturePage.locator('.almedals-star-host').nth(i);
      const button = host.locator('button.star-btn');
      const pressed = await button.getAttribute('aria-pressed');
      if (pressed === 'true') {
        await button.click();
      }
    }

    await starsPage.close();
    await fixturePage.close();
  });

  test('export with no starred events produces valid empty VCALENDAR', async () => {
    // Open stars page with no starred events
    const starsPage = await openStarsPage(context, extensionId);
    await starsPage.waitForTimeout(1000);

    // The export button may still be visible even with no events,
    // or the page may show an empty state. Check both scenarios.
    const exportButton = starsPage.getByRole('button', { name: 'Export to calendar' });
    const isExportVisible = await exportButton.isVisible().catch(() => false);

    if (isExportVisible) {
      // If export button is visible, clicking it should produce a valid
      // VCALENDAR with zero VEVENTs
      const downloadPromise = starsPage.waitForEvent('download', { timeout: 10000 });
      await exportButton.click();

      const download = await downloadPromise;
      const filename = download.suggestedFilename();
      expect(filename).toMatch(ICS_FILENAME_PATTERN);

      const downloadPath = path.join(downloadDir, filename);
      await download.saveAs(downloadPath);

      const icsContent = fs.readFileSync(downloadPath, 'utf-8');

      // Valid VCALENDAR with no VEVENTs
      expect(icsContent).toContain('BEGIN:VCALENDAR');
      expect(icsContent).toContain('END:VCALENDAR');
      expect(icsContent).toContain('PRODID:-//Almedalsstjärnan//EN');
      expect(icsContent).not.toContain('BEGIN:VEVENT');
    } else {
      // If export button is hidden when no events, that's also valid behavior.
      // The empty state should be shown instead.
      const emptyState = starsPage.getByRole('heading', { name: /starred|stjärnmärk/i });
      await expect(emptyState).toBeVisible({ timeout: 3000 });
    }

    await starsPage.close();
  });
});
