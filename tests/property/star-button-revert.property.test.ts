/**
 * Property-based test for Star Button revert on message failure.
 *
 * Feature: ux-enhancements, Property 8: star button reverts on message failure
 * Validates: Requirements 7.8
 *
 * For any star button in a given visual state (starred or unstarred), if the
 * corresponding message to the background service worker fails (rejects or
 * returns success: false), the button SHALL return to its original visual state
 * (the aria-pressed attribute SHALL equal its value before the click).
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import fc from 'fast-check';

import type { IBrowserApiAdapter, MessagePayload, MessageResponse } from '#core/types';
import { createStarButton } from '#extension/star-button';
import { mockBrowserApi } from '#test/helpers/mock-browser-api';
import { processEventCard } from '#extension/content-script';
import { createMockEventCard } from '#test/helpers/dom-helpers';

// Feature: ux-enhancements, Property 8: star button reverts on message failure

describe('Property 8: star button reverts on message failure', () => {
  const hosts: HTMLElement[] = [];

  afterEach(() => {
    for (const host of hosts) {
      host.remove();
    }
    hosts.length = 0;
    document.body.innerHTML = '';
  });

  function createHost(): HTMLElement {
    const host = document.createElement('div');
    document.body.appendChild(host);
    hosts.push(host);
    return host;
  }

  function setupAdapter(): IBrowserApiAdapter {
    const adapter = { ...mockBrowserApi };
    (adapter.getMessage as ReturnType<typeof vi.fn>).mockImplementation(
      (key: string) => {
        if (key === 'starEvent') return 'Star event';
        if (key === 'unstarEvent') return 'Unstar event';
        return '';
      },
    );
    return adapter;
  }

  it('button reverts to original state when onStar callback rejects (initially unstarred)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }),
        async (eventId: string) => {
          const host = createHost();
          const adapter = setupAdapter();

          const onStar = vi.fn().mockRejectedValue(new Error('Service worker unavailable'));
          const onUnstar = vi.fn().mockResolvedValue(undefined);

          createStarButton(host, {
            eventId,
            initialStarred: false,
            adapter,
            onStar,
            onUnstar,
          });

          const btn = host.shadowRoot!.querySelector('button.star-btn') as HTMLButtonElement;
          expect(btn.getAttribute('aria-pressed')).toBe('false');

          btn.click();
          await new Promise((r) => setTimeout(r, 20));

          // Button should revert to unstarred (original state)
          expect(btn.getAttribute('aria-pressed')).toBe('false');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('button reverts to original state when onUnstar callback rejects (initially starred)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }),
        async (eventId: string) => {
          const host = createHost();
          const adapter = setupAdapter();

          const onStar = vi.fn().mockResolvedValue(undefined);
          const onUnstar = vi.fn().mockRejectedValue(new Error('Service worker unavailable'));

          createStarButton(host, {
            eventId,
            initialStarred: true,
            adapter,
            onStar,
            onUnstar,
          });

          const btn = host.shadowRoot!.querySelector('button.star-btn') as HTMLButtonElement;
          expect(btn.getAttribute('aria-pressed')).toBe('true');

          btn.click();
          await new Promise((r) => setTimeout(r, 20));

          // Button should revert to starred (original state)
          expect(btn.getAttribute('aria-pressed')).toBe('true');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('button reverts to original state for any initial state when callback fails', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(),
        fc.string({ minLength: 1, maxLength: 20 }),
        async (initialStarred: boolean, eventId: string) => {
          const host = createHost();
          const adapter = setupAdapter();

          const onStar = vi.fn().mockRejectedValue(new Error('Failed'));
          const onUnstar = vi.fn().mockRejectedValue(new Error('Failed'));

          createStarButton(host, {
            eventId,
            initialStarred,
            adapter,
            onStar,
            onUnstar,
          });

          const btn = host.shadowRoot!.querySelector('button.star-btn') as HTMLButtonElement;
          const originalAriaPressed = btn.getAttribute('aria-pressed');

          btn.click();
          await new Promise((r) => setTimeout(r, 20));

          // Button should revert to its original state
          expect(btn.getAttribute('aria-pressed')).toBe(originalAriaPressed);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('content-script onStar reverts button when sendMessage returns success: false', async () => {
    let counter = 0;
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(),
        async () => {
          counter++;
          const uniqueId = `evt-star-fail-${counter}`;
          const adapter = setupAdapter();
          (adapter.sendMessage as ReturnType<typeof vi.fn>).mockImplementation(
            (message: MessagePayload): Promise<MessageResponse<unknown>> => {
              if (message.command === 'GET_STAR_STATE') {
                return Promise.resolve({ success: true, data: false });
              }
              if (message.command === 'STAR_EVENT') {
                return Promise.resolve({ success: false, error: 'Storage full' });
              }
              return Promise.resolve({ success: true, data: undefined });
            },
          );

          const card = createMockEventCard({
            eventId: uniqueId,
            liId: `item_4_${uniqueId}`,
            divId: `item4_${uniqueId}`,
          });
          document.body.appendChild(card);

          await processEventCard(card, adapter);

          const host = card.querySelector('.almedals-star-host') as HTMLElement;
          const btn = host.shadowRoot!.querySelector('button.star-btn') as HTMLButtonElement;

          // Initially unstarred
          expect(btn.getAttribute('aria-pressed')).toBe('false');

          // Click to star — should fail and revert
          btn.click();
          await new Promise((r) => setTimeout(r, 20));

          // Should revert to unstarred
          expect(btn.getAttribute('aria-pressed')).toBe('false');

          // Cleanup
          card.remove();
        },
      ),
      { numRuns: 20 },
    );
  });

  it('content-script onUnstar reverts button when sendMessage throws', async () => {
    let counter = 0;
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(),
        async () => {
          counter++;
          const uniqueId = `evt-unstar-fail-${counter}`;
          const adapter = setupAdapter();
          (adapter.sendMessage as ReturnType<typeof vi.fn>).mockImplementation(
            (message: MessagePayload): Promise<MessageResponse<unknown>> => {
              if (message.command === 'GET_STAR_STATE') {
                return Promise.resolve({ success: true, data: true });
              }
              if (message.command === 'UNSTAR_EVENT') {
                return Promise.reject(new Error('Extension context invalidated'));
              }
              return Promise.resolve({ success: true, data: undefined });
            },
          );

          const card = createMockEventCard({
            eventId: uniqueId,
            liId: `item_4_${uniqueId}`,
            divId: `item4_${uniqueId}`,
          });
          document.body.appendChild(card);

          await processEventCard(card, adapter);

          const host = card.querySelector('.almedals-star-host') as HTMLElement;
          const btn = host.shadowRoot!.querySelector('button.star-btn') as HTMLButtonElement;

          // Initially starred
          expect(btn.getAttribute('aria-pressed')).toBe('true');

          // Click to unstar — should fail and revert
          btn.click();
          await new Promise((r) => setTimeout(r, 20));

          // Should revert to starred
          expect(btn.getAttribute('aria-pressed')).toBe('true');

          // Cleanup
          card.remove();
        },
      ),
      { numRuns: 20 },
    );
  });
});
