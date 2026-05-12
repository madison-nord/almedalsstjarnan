/**
 * Unit tests for star button positioning on the programme page.
 *
 * Verifies that the star button host is inserted INSIDE the title link element,
 * before the h2, so it appears inline with the title text.
 *
 * Requirements: 5.3, 5.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { mockBrowserApi, resetMocks } from '#test/helpers/mock-browser-api';
import { createMockEventCard } from '#test/helpers/dom-helpers';
import { processEventCard } from '#extension/content-script';

// ─── Helpers ──────────────────────────────────────────────────────

function setupMocks(): void {
  (mockBrowserApi.getMessage as ReturnType<typeof vi.fn>).mockImplementation(
    (key: string) => key,
  );
  (mockBrowserApi.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
    success: true,
    data: false,
  });
  (mockBrowserApi.onStorageChanged as ReturnType<typeof vi.fn>).mockReturnValue(vi.fn());
}

// ─── Tests ────────────────────────────────────────────────────────

describe('Star button position on programme page', () => {
  beforeEach(() => {
    resetMocks();
    setupMocks();
  });

  it('star host is inserted inside the title link element (a.title)', async () => {
    const card = createMockEventCard();
    document.body.appendChild(card);

    await processEventCard(card, mockBrowserApi);

    const titleLink = card.querySelector('a.title');
    expect(titleLink).not.toBeNull();

    const starHost = titleLink!.querySelector('.almedals-star-host');
    expect(starHost).not.toBeNull();

    document.body.removeChild(card);
  });

  it('star host is positioned before the h2 element', async () => {
    const card = createMockEventCard();
    document.body.appendChild(card);

    await processEventCard(card, mockBrowserApi);

    const titleLink = card.querySelector('a.title');
    const h2 = titleLink!.querySelector('h2');
    const starHost = titleLink!.querySelector('.almedals-star-host');

    expect(starHost).not.toBeNull();
    expect(h2).not.toBeNull();

    // Star host should come before h2 in the DOM
    const children = Array.from(titleLink!.children);
    const starIndex = children.indexOf(starHost as Element);
    const h2Index = children.indexOf(h2 as Element);
    expect(starIndex).toBeLessThan(h2Index);

    document.body.removeChild(card);
  });

  it('star host uses display:inline-flex for inline positioning', async () => {
    const card = createMockEventCard();
    document.body.appendChild(card);

    await processEventCard(card, mockBrowserApi);

    const starHost = card.querySelector('.almedals-star-host') as HTMLElement;
    expect(starHost).not.toBeNull();
    expect(starHost.style.display).toBe('inline-flex');

    document.body.removeChild(card);
  });

  it('star host uses vertical-align:middle to center with first line of text', async () => {
    const card = createMockEventCard();
    document.body.appendChild(card);

    await processEventCard(card, mockBrowserApi);

    const starHost = card.querySelector('.almedals-star-host') as HTMLElement;
    expect(starHost).not.toBeNull();
    expect(starHost.style.verticalAlign).toBe('middle');

    document.body.removeChild(card);
  });
});
