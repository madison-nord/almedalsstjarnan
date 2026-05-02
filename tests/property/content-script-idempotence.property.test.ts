/**
 * Property-based test for Content Script injection idempotence.
 *
 * Feature: almedals-planner-extension, Property 12: Content script injection idempotence
 * Validates: Requirements 4.4, 4.5, 20.3
 *
 * Running injection twice produces the same number of Star_Buttons as once.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';

import type { IBrowserApiAdapter, MessagePayload, MessageResponse } from '#core/types';
import { initContentScript, findEventCards } from '#extension/content-script';
import { mockBrowserApi, resetMocks } from '#test/helpers/mock-browser-api';
import { createMockEventCard } from '#test/helpers/dom-helpers';

// Feature: almedals-planner-extension, Property 12: Content script injection idempotence

function setupAdapter(): IBrowserApiAdapter {
  const adapter = mockBrowserApi;
  (adapter.getMessage as ReturnType<typeof vi.fn>).mockImplementation(
    (key: string) => {
      if (key === 'starEvent') return 'Star event';
      if (key === 'unstarEvent') return 'Unstar event';
      return '';
    },
  );
  (adapter.sendMessage as ReturnType<typeof vi.fn>).mockImplementation(
    (message: MessagePayload): Promise<MessageResponse<boolean>> => {
      if (message.command === 'GET_STAR_STATE') {
        return Promise.resolve({ success: true, data: false });
      }
      return Promise.resolve({ success: true, data: undefined as unknown as boolean });
    },
  );
  return adapter;
}

async function flushAsync(): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

describe('Property 12: Content script injection idempotence', () => {
  beforeEach(() => {
    resetMocks();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('running initContentScript twice produces same number of Star_Buttons as once', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 20 }),
        async (numCards: number) => {
          // Clean up from previous iteration
          document.body.innerHTML = '';
          resetMocks();
          const adapter = setupAdapter();

          // Create N event cards with unique IDs
          for (let i = 0; i < numCards; i++) {
            const card = createMockEventCard({
              eventId: String(50000 + i),
              liId: `item_4_prop${i}`,
              divId: `item4_prop${i}`,
            });
            document.body.appendChild(card);
          }

          // First injection
          initContentScript(adapter);
          await flushAsync();

          const countAfterFirst = document.querySelectorAll('.almedals-star-host').length;

          // Second injection (simulates re-running content script)
          // Reset the adapter mocks but keep the DOM state
          resetMocks();
          const adapter2 = setupAdapter();
          initContentScript(adapter2);
          await flushAsync();

          const countAfterSecond = document.querySelectorAll('.almedals-star-host').length;

          // Idempotence: same number of star buttons after second injection
          expect(countAfterSecond).toBe(countAfterFirst);
          // And the count should equal the number of cards
          expect(countAfterFirst).toBe(numCards);
        },
      ),
      { numRuns: 100 },
    );
  });
});
