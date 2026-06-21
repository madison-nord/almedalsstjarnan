/**
 * Captures Chrome Web Store screenshots for the Almedalsstjärnan extension.
 *
 * Produces screenshots at 1280×800 (Chrome Web Store required dimensions):
 *   1. Programme page with star buttons visible next to event titles
 *   2. Programme page with some events starred (filled star icons)
 *   3. Stars overview page showing starred events
 *   4. Popup showing quick event list
 *
 * Prerequisites:
 *   - Run `pnpm build` first (needs dist/ directory)
 *   - Playwright browsers installed (`pnpm exec playwright install chromium`)
 *   - Internet connection (loads the live almedalsveckan.info site)
 *
 * Usage:
 *   pnpm tsx scripts/capture-store-screenshots.ts
 */

import { chromium, type BrowserContext, type Page } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const EXTENSION_PATH = path.resolve(ROOT, 'dist');
const OUTPUT_DIR = path.resolve(ROOT, 'store');

const WIDTH = 1280;
const HEIGHT = 800;

const PROGRAMME_URL =
  'https://almedalsveckan.info/rg/almedalsveckan/officiellt-program/program-2026';

// ─── Helpers ──────────────────────────────────────────────────────

async function launchExtensionContext(): Promise<BrowserContext> {
  return chromium.launchPersistentContext('', {
    headless: false,
    viewport: { width: WIDTH, height: HEIGHT },
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-first-run',
      '--disable-default-apps',
      '--disable-infobars',
      '--enable-automation=false',
      `--window-size=${WIDTH},${HEIGHT}`,
    ],
  });
}

/**
 * Dismisses the cookie consent banner by clicking "Godkänn alla kakor".
 */
async function dismissCookieBanner(page: Page): Promise<void> {
  try {
    // Look for the "Godkänn alla kakor" button (accept all cookies)
    const acceptButton = page.getByRole('button', { name: /Godkänn alla/i });
    if (await acceptButton.isVisible({ timeout: 5000 })) {
      await acceptButton.click();
      console.log('  Dismissed cookie consent banner');
      await page.waitForTimeout(1000);
    }
  } catch {
    // No cookie banner or already dismissed — that's fine
    console.log('  No cookie banner found (or already dismissed)');
  }
}

async function getExtensionId(context: BrowserContext): Promise<string> {
  let sw = context.serviceWorkers()[0];
  if (!sw) {
    sw = await context.waitForEvent('serviceworker');
  }
  const match = sw.url().match(/chrome-extension:\/\/([^/]+)\//);
  if (!match?.[1]) throw new Error('Could not extract extension ID');
  return match[1];
}

/**
 * Clicks star buttons inside Shadow DOM by evaluating in-page JS.
 * Returns the number of events successfully starred.
 */
async function starEvents(page: Page, count: number): Promise<number> {
  return page.evaluate((n) => {
    const hosts = document.querySelectorAll('[data-almedals-planner-initialized="1"] .almedals-star-host');
    let starred = 0;
    for (let i = 0; i < Math.min(n, hosts.length); i++) {
      const shadow = hosts[i]?.shadowRoot;
      if (!shadow) continue;
      const btn = shadow.querySelector('button');
      if (btn && btn.getAttribute('aria-pressed') === 'false') {
        btn.click();
        starred++;
      }
    }
    return starred;
  }, count);
}

/**
 * Scrolls the page so that event cards with star buttons are prominently visible.
 */
async function scrollToEvents(page: Page): Promise<void> {
  await page.evaluate(() => {
    const firstHost = document.querySelector('.almedals-star-host');
    if (firstHost) {
      // Scroll so the first star button is about 100px from the top
      const rect = firstHost.getBoundingClientRect();
      window.scrollBy(0, rect.top - 100);
    }
  });
  await page.waitForTimeout(500);
}

// ─── Main ─────────────────────────────────────────────────────────

async function main(): Promise<void> {
  if (!fs.existsSync(EXTENSION_PATH)) {
    console.error('Error: dist/ not found. Run `pnpm build` first.');
    process.exit(1);
  }

  console.log('Launching Chromium with extension...');
  const context = await launchExtensionContext();

  try {
    const extensionId = await getExtensionId(context);
    console.log(`Extension ID: ${extensionId}`);

    // ─── Load programme page ────────────────────────────────────
    // Use the first existing page or create a new one
    const page = context.pages()[0] ?? await context.newPage();
    console.log('\nNavigating to programme page...');
    await page.goto(PROGRAMME_URL, { waitUntil: 'networkidle', timeout: 60000 });

    // Dismiss cookie consent banner first
    await dismissCookieBanner(page);

    // Wait for event cards to appear
    console.log('Waiting for event cards...');
    try {
      await page.waitForSelector('li .event-information', { timeout: 20000 });
    } catch {
      console.error('No event cards appeared. The programme page may not have events loaded.');
      process.exit(1);
    }

    // Wait for content script to inject star buttons
    console.log('Waiting for star buttons...');
    await page.waitForTimeout(5000);

    // Verify star buttons exist
    const hostCount = await page.evaluate(() =>
      document.querySelectorAll('[data-almedals-planner-initialized="1"]').length,
    );
    console.log(`Found ${hostCount} initialized event cards`);

    if (hostCount === 0) {
      console.error('Content script did not inject star buttons.');
      process.exit(1);
    }

    // ─── Screenshot 1: Programme page with unstarred buttons ────
    console.log('\n📸 1/4: Programme page with star buttons (unstarred)');
    await scrollToEvents(page);
    await page.screenshot({
      path: path.resolve(OUTPUT_DIR, 'screenshot-1-programme-unstarred.png'),
    });
    console.log('  ✓ screenshot-1-programme-unstarred.png');

    // ─── Screenshot 2: Star some events, show filled stars ──────
    console.log('\n📸 2/4: Programme page with starred events');
    const starredCount = await starEvents(page, 4);
    console.log(`  Starred ${starredCount} events`);
    await page.waitForTimeout(1000);
    await scrollToEvents(page);
    await page.screenshot({
      path: path.resolve(OUTPUT_DIR, 'screenshot-2-programme-starred.png'),
    });
    console.log('  ✓ screenshot-2-programme-starred.png');

    // ─── Screenshot 3: Stars overview page ──────────────────────
    console.log('\n📸 3/4: Stars overview page');
    const starsPage = await context.newPage();
    await starsPage.setViewportSize({ width: WIDTH, height: HEIGHT });
    await starsPage.goto(`chrome-extension://${extensionId}/src/ui/stars/stars.html`);
    await starsPage.waitForLoadState('domcontentloaded');
    await starsPage.waitForTimeout(3000);
    await starsPage.screenshot({
      path: path.resolve(OUTPUT_DIR, 'screenshot-3-stars-page.png'),
    });
    console.log('  ✓ screenshot-3-stars-page.png');

    // ─── Screenshot 4: Popup ────────────────────────────────────
    console.log('\n📸 4/4: Extension popup');

    // First, set onboarding as dismissed via the service worker
    // so the help modal doesn't show and grey out the popup content
    const swPage = await context.newPage();
    await swPage.goto(`chrome-extension://${extensionId}/src/ui/popup/popup.html`);
    await swPage.waitForLoadState('domcontentloaded');
    await swPage.waitForTimeout(1500);

    // Send SET_ONBOARDING_STATE message to dismiss onboarding
    await swPage.evaluate(() => {
      return chrome.runtime.sendMessage({
        command: 'SET_ONBOARDING_STATE',
        dismissed: true,
      });
    });
    await swPage.close();

    // Now open the popup fresh — onboarding is dismissed, content will show
    // Use actual popup dimensions (360×600) to avoid whitespace
    const popupPage = await context.newPage();
    await popupPage.setViewportSize({ width: 360, height: 600 });
    await popupPage.goto(`chrome-extension://${extensionId}/src/ui/popup/popup.html`);
    await popupPage.waitForLoadState('domcontentloaded');
    await popupPage.waitForTimeout(3000);

    await popupPage.screenshot({
      path: path.resolve(OUTPUT_DIR, 'screenshot-4-popup.png'),
    });
    console.log('  ✓ screenshot-4-popup.png');

    console.log('\n✅ All screenshots saved to store/');
    console.log('Files:');
    console.log('  • screenshot-1-programme-unstarred.png  (star buttons visible, none starred)');
    console.log('  • screenshot-2-programme-starred.png    (some events starred with filled stars)');
    console.log('  • screenshot-3-stars-page.png           (starred events overview)');
    console.log('  • screenshot-4-popup.png                (popup with event list)');
  } finally {
    await context.close();
  }

  // ─── Generate promotional tile (440×280) ──────────────────────
  console.log('\n📸 Generating promotional tile (440×280)...');
  await generatePromoTile();
  console.log('  ✓ promo-tile-440x280.png');
}

/**
 * Generates a 440×280 promotional tile for Chrome Web Store.
 * Uses sharp to create a branded image with the extension icon and name.
 */
async function generatePromoTile(): Promise<void> {
  const sharp = (await import('sharp')).default;
  const iconPath = path.resolve(ROOT, 'icons/icon-128.png');

  // Create a dark navy background (brand-secondary color) with centered content
  // The tile shows: icon + extension name + tagline
  const svgOverlay = `
    <svg width="440" height="280" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#1e3a5f"/>
          <stop offset="100%" style="stop-color:#0f2440"/>
        </linearGradient>
      </defs>
      <rect width="440" height="280" fill="url(#bg)"/>
      <!-- Gold star accent -->
      <text x="220" y="85" font-family="Arial, sans-serif" font-size="48" fill="#f59e0b" text-anchor="middle">★</text>
      <!-- Extension name -->
      <text x="220" y="155" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#ffffff" text-anchor="middle">Almedalsstjärnan</text>
      <!-- Tagline -->
      <text x="220" y="195" font-family="Arial, sans-serif" font-size="14" fill="#94a3b8" text-anchor="middle">Star events at Almedalsveckan</text>
      <text x="220" y="215" font-family="Arial, sans-serif" font-size="14" fill="#94a3b8" text-anchor="middle">Export your schedule as ICS</text>
    </svg>
  `;

  // Composite icon on top of the background
  const iconBuffer = await sharp(iconPath).resize(64, 64).toBuffer();

  await sharp(Buffer.from(svgOverlay))
    .composite([
      {
        input: iconBuffer,
        top: 40,
        left: 188, // centered: (440 - 64) / 2
      },
    ])
    .png()
    .toFile(path.resolve(OUTPUT_DIR, 'promo-tile-440x280.png'));
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
