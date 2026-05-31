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

  it('star host is inserted inside the title h2 element', async () => {
    const card = createMockEventCard();
    document.body.appendChild(card);

    await processEventCard(card, mockBrowserApi);

    const titleH2 = card.querySelector('a.title h2');
    expect(titleH2).not.toBeNull();

    const starHost = titleH2!.querySelector('.almedals-star-host');
    expect(starHost).not.toBeNull();

    document.body.removeChild(card);
  });

  it('star host is the first child of the h2 element', async () => {
    const card = createMockEventCard();
    document.body.appendChild(card);

    await processEventCard(card, mockBrowserApi);

    const titleH2 = card.querySelector('a.title h2');
    const starHost = titleH2!.querySelector('.almedals-star-host');

    expect(starHost).not.toBeNull();
    expect(titleH2!.firstElementChild).toBe(starHost);

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
