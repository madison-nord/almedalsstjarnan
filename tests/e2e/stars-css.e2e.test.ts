/**
 * E2E test: Stars page CSS bundling
 *
 * Verifies that the stars page CSS is correctly bundled and applied
 * by checking computed styles on the root container element.
 *
 * This is a TDD test written before fixing the CSS bundling issue.
 * It loads the stars page from the built extension and asserts that
 * Tailwind CSS classes (min-h-screen, flex, flex-col) produce the
 * expected computed styles.
 *
 * Validates: Requirements 4.4, 4.5
 *
 * NOTE: Chrome extensions require headless: false (non-headless Chromium).
 */

import { test, expect, chromium, type BrowserContext } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = path.resolve(__dirname, '../../dist');

test.describe('Stars page CSS bundling', () => {
  let context: BrowserContext;
  let extensionId: string;

  test.beforeAll(async () => {
    context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-first-run',
        '--disable-default-apps',
      ],
    });

    // Get extension ID from service worker
    let sw = context.serviceWorkers()[0];
    if (!sw) sw = await context.waitForEvent('serviceworker');
    const match = sw.url().match(/chrome-extension:\/\/([^/]+)\//);
    if (!match?.[1]) {
      throw new Error(`Could not extract extension ID from service worker URL: ${sw.url()}`);
    }
    extensionId = match[1];
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('stars page root container has display: flex and min-height: 100vh', async () => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/src/ui/stars/stars.html`);
    await page.waitForLoadState('domcontentloaded');

    // The React app renders a div with "min-h-screen flex flex-col" inside #root.
    // Both the loading state and main state use min-h-screen + flex, so we can
    // assert on the first direct child div of #root regardless of load state.
    const rootContainer = page.locator('#root > div').first();

    // Wait for React to render at least one child into #root
    await expect(rootContainer).toBeAttached({ timeout: 5000 });

    const display = await rootContainer.evaluate(
      (el) => getComputedStyle(el).display,
    );

    // getComputedStyle resolves 100vh to pixels equal to the viewport height.
    // We verify min-height matches window.innerHeight to confirm the Tailwind
    // min-h-screen class is applied correctly.
    const { minHeight, viewportHeight } = await rootContainer.evaluate((el) => ({
      minHeight: getComputedStyle(el).minHeight,
      viewportHeight: window.innerHeight,
    }));

    // min-h-screen = min-height: 100vh, flex = display: flex
    expect(display).toBe('flex');
    expect(minHeight).toBe(`${viewportHeight}px`);

    await page.close();
  });
});
