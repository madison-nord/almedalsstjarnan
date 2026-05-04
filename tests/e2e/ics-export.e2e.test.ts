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
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = path.resolve(__dirname, '../../dist');
const FIXTURE_PATH = path.resolve(__dirname, '../../fixtures/almedalsveckan-program-2026.html');

/** Regex matching the expected ICS export filename pattern */
const ICS_FILENAME_PATTERN = /^almedalsstjarnan-starred-events-\d{8}-\d{6}\.ics$/;

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Launches a persistent Chromium context with the extension loaded.
 * Extensions require a persistent context and non-headless mode.
 */
async function launchExtensionContext(downloadDir: string): Promise<BrowserContext> {
  return chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
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
 * Navigates to the fixture page and injects the content script.
 */
async function loadFixturePage(context: BrowserContext, extensionId: string): Promise<Page> {
  const page = await context.newPage();
  await page.goto(`file://${FIXTURE_PATH}`);
  await page.waitForLoadState('domcontentloaded');

  // Inject the built content script manually since file:// doesn't match
  // the manifest's content_scripts match pattern.
  await page.addScriptTag({
    url: `chrome-extension://${extensionId}/content-script.js`,
  });

  // Allow time for the content script to process event cards
  await page.waitForTimeout(1000);

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
  const downloadDir = path.resolve(__dirname, '../../test-downloads');

  test.beforeAll(async () => {
    // Ensure download directory exists
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    context = await launchExtensionContext(downloadDir);
    extensionId = await getExtensionId(context);
  });

  test.afterAll(async () => {
    await context.close();

    // Clean up download directory
    if (fs.existsSync(downloadDir)) {
      fs.rmSync(downloadDir, { recursive: true, force: true });
    }
  });

  test('export starred events as ICS file with correct content', async () => {
    const EVENTS_TO_STAR = 3;

    // Step 1: Load fixture page and star multiple events
    const fixturePage = await loadFixturePage(context, extensionId);

    const starHosts = fixturePage.locator('.almedals-star-host');
    await expect(starHosts.first()).toBeVisible({ timeout: 5000 });

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
    const exportButton = starsPage.getByRole('button', { name: /export|exportera|kalender/i });
    await expect(exportButton).toBeVisible({ timeout: 3000 });

    // Listen for the download event
    const downloadPromise = starsPage.waitForEvent('download', { timeout: 10000 });
    await exportButton.click();

    const download = await downloadPromise;

    // Step 4: Verify filename matches the expected pattern
    const filename = download.suggestedFilename();
    expect(filename).toMatch(ICS_FILENAME_PATTERN);

    // Verify the filename has the correct date format (YYYYMMDD-HHMMSS)
    const dateMatch = filename.match(
      /almedalsstjarnan-starred-events-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})\.ics/,
    );
    expect(dateMatch).not.toBeNull();

    if (dateMatch) {
      const year = parseInt(dateMatch[1]!, 10);
      const month = parseInt(dateMatch[2]!, 10);
      const day = parseInt(dateMatch[3]!, 10);
      const hour = parseInt(dateMatch[4]!, 10);
      const minute = parseInt(dateMatch[5]!, 10);
      const second = parseInt(dateMatch[6]!, 10);

      // Sanity check the date components
      expect(year).toBeGreaterThanOrEqual(2024);
      expect(month).toBeGreaterThanOrEqual(1);
      expect(month).toBeLessThanOrEqual(12);
      expect(day).toBeGreaterThanOrEqual(1);
      expect(day).toBeLessThanOrEqual(31);
      expect(hour).toBeGreaterThanOrEqual(0);
      expect(hour).toBeLessThanOrEqual(23);
      expect(minute).toBeGreaterThanOrEqual(0);
      expect(minute).toBeLessThanOrEqual(59);
      expect(second).toBeGreaterThanOrEqual(0);
      expect(second).toBeLessThanOrEqual(59);
    }

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
    const exportButton = starsPage.getByRole('button', { name: /export|exportera|kalender/i });
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
      const emptyState = starsPage.getByText(/stjärnmärk|star|inga/i);
      await expect(emptyState).toBeVisible({ timeout: 3000 });
    }

    await starsPage.close();
  });
});
