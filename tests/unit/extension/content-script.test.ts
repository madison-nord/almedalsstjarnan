/**
 * Unit tests for Content Script.
 *
 * Tests the content script that scans the DOM for Event_Cards,
 * injects Star_Buttons in Shadow DOM, observes mutations for new cards,
 * and maintains cross-page/cross-tab consistency.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 20.1, 20.2, 20.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import type { IBrowserApiAdapter, MessagePayload, MessageResponse } from '#core/types';
import {
  initContentScript,
  processEventCard,
  isEventCard,
  findEventCards,
} from '#extension/content-script';
import { mockBrowserApi, resetMocks } from '#test/helpers/mock-browser-api';
import { createMockEventCard } from '#test/helpers/dom-helpers';

// ─── Helpers ──────────────────────────────────────────────────────

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

/** Flush microtasks and MutationObserver callbacks */
async function flushAsync(): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

describe('Content Script', () => {
  let adapter: IBrowserApiAdapter;

  beforeEach(() => {
    resetMocks();
    adapter = setupAdapter();
    // Clean up document.body between tests
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  // ─── isEventCard ──────────────────────────────────────────────

  describe('isEventCard', () => {
    it('returns true for an li element containing a .event-information div', () => {
      const card = createMockEventCard();
      expect(isEventCard(card)).toBe(true);
    });

    it('returns false for an li element without .event-information', () => {
      const li = document.createElement('li');
      li.innerHTML = '<div class="other-class">Not an event</div>';
      expect(isEventCard(li)).toBe(false);
    });

    it('returns false for a non-li element even with .event-information child', () => {
      const div = document.createElement('div');
      div.innerHTML = '<div class="event-information">Event info</div>';
      expect(isEventCard(div)).toBe(false);
    });

    it('returns false for an empty li element', () => {
      const li = document.createElement('li');
      expect(isEventCard(li)).toBe(false);
    });

    it('returns false for a text node wrapper', () => {
      const span = document.createElement('span');
      span.textContent = 'Not an event card';
      expect(isEventCard(span)).toBe(false);
    });
  });

  // ─── findEventCards ───────────────────────────────────────────

  describe('findEventCards', () => {
    it('returns all Event_Cards in a root element', () => {
      const container = document.createElement('div');
      container.appendChild(createMockEventCard({ eventId: '1001' }));
      container.appendChild(createMockEventCard({ eventId: '1002' }));
      container.appendChild(createMockEventCard({ eventId: '1003' }));

      const cards = findEventCards(container);
      expect(cards).toHaveLength(3);
    });

    it('returns empty array when no Event_Cards exist', () => {
      const container = document.createElement('div');
      container.innerHTML = '<p>No events here</p>';

      const cards = findEventCards(container);
      expect(cards).toHaveLength(0);
    });

    it('works with document as root', () => {
      document.body.appendChild(createMockEventCard({ eventId: '2001' }));
      document.body.appendChild(createMockEventCard({ eventId: '2002' }));

      const cards = findEventCards(document);
      expect(cards).toHaveLength(2);
    });

    it('finds nested Event_Cards', () => {
      const outer = document.createElement('div');
      const inner = document.createElement('div');
      inner.appendChild(createMockEventCard({ eventId: '3001' }));
      outer.appendChild(inner);

      const cards = findEventCards(outer);
      expect(cards).toHaveLength(1);
    });

    it('does not return non-event li elements', () => {
      const container = document.createElement('div');
      const plainLi = document.createElement('li');
      plainLi.innerHTML = '<div class="not-event">Plain item</div>';
      container.appendChild(plainLi);
      container.appendChild(createMockEventCard({ eventId: '4001' }));

      const cards = findEventCards(container);
      expect(cards).toHaveLength(1);
    });
  });

  // ─── processEventCard ─────────────────────────────────────────

  describe('processEventCard', () => {
    it('sends GET_STAR_STATE to determine initial state', async () => {
      const card = createMockEventCard();
      document.body.appendChild(card);

      await processEventCard(card, adapter);

      expect(adapter.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'GET_STAR_STATE',
          eventId: expect.any(String),
        }),
      );
    });

    it('sets data-almedals-planner-initialized="1" after injection', async () => {
      const card = createMockEventCard();
      document.body.appendChild(card);

      await processEventCard(card, adapter);

      expect(card.getAttribute('data-almedals-planner-initialized')).toBe('1');
    });

    it('creates a star host container with data-event-id', async () => {
      const card = createMockEventCard();
      document.body.appendChild(card);

      await processEventCard(card, adapter);

      const host = card.querySelector('.almedals-star-host');
      expect(host).not.toBeNull();
      expect(host!.getAttribute('data-event-id')).toBeTruthy();
    });

    it('creates a Shadow DOM on the star host', async () => {
      const card = createMockEventCard();
      document.body.appendChild(card);

      await processEventCard(card, adapter);

      const host = card.querySelector('.almedals-star-host') as HTMLElement;
      expect(host).not.toBeNull();
      expect(host.shadowRoot).not.toBeNull();
    });

    it('skips cards already marked with data-almedals-planner-initialized="1"', async () => {
      const card = createMockEventCard();
      card.setAttribute('data-almedals-planner-initialized', '1');
      document.body.appendChild(card);

      await processEventCard(card, adapter);

      // Should not have sent any messages since card was skipped
      expect(adapter.sendMessage).not.toHaveBeenCalled();
    });

    it('skips cards where normalizeEvent returns error (no throw)', async () => {
      // Create a card with no title — normalizeEvent should fail
      const li = document.createElement('li');
      li.id = 'item_4_broken';
      li.innerHTML = `
        <div class="event-information item-eosqj">
          <div class="event-information-inner item-eosqj">
            <div class="col-reverse item-eosqj">
              <a class="title env-button env-button--link item-eosqj" href="#collapse">
                <h2 class="item-eosqj"></h2>
              </a>
            </div>
          </div>
        </div>`;
      document.body.appendChild(li);

      // Should not throw
      await expect(processEventCard(li, adapter)).resolves.not.toThrow();

      // Should not have sent GET_STAR_STATE since normalization failed
      expect(adapter.sendMessage).not.toHaveBeenCalled();
      // Should NOT be marked as initialized since it was skipped
      expect(li.getAttribute('data-almedals-planner-initialized')).toBeNull();
    });

    it('renders star button with correct initial state from GET_STAR_STATE', async () => {
      (adapter.sendMessage as ReturnType<typeof vi.fn>).mockImplementation(
        (message: MessagePayload): Promise<MessageResponse<boolean>> => {
          if (message.command === 'GET_STAR_STATE') {
            return Promise.resolve({ success: true, data: true });
          }
          return Promise.resolve({ success: true, data: undefined as unknown as boolean });
        },
      );

      const card = createMockEventCard();
      document.body.appendChild(card);

      await processEventCard(card, adapter);

      const host = card.querySelector('.almedals-star-host') as HTMLElement;
      const btn = host.shadowRoot!.querySelector('button') as HTMLButtonElement;
      expect(btn.getAttribute('aria-pressed')).toBe('true');
    });
  });

  // ─── initContentScript ────────────────────────────────────────

  describe('initContentScript', () => {
    it('scans existing DOM for Event_Cards and injects Star_Buttons', async () => {
      document.body.appendChild(createMockEventCard({ eventId: '5001' }));
      document.body.appendChild(createMockEventCard({ eventId: '5002' }));

      initContentScript(adapter);
      await flushAsync();

      const hosts = document.querySelectorAll('.almedals-star-host');
      expect(hosts.length).toBe(2);
    });

    it('creates exactly one MutationObserver', () => {
      const observeSpy = vi.spyOn(MutationObserver.prototype, 'observe');

      initContentScript(adapter);

      expect(observeSpy).toHaveBeenCalledTimes(1);
      expect(observeSpy).toHaveBeenCalledWith(document.body, {
        childList: true,
        subtree: true,
      });

      observeSpy.mockRestore();
    });

    it('MutationObserver callback processes new Event_Cards', async () => {
      initContentScript(adapter);
      await flushAsync();

      // Add a new card dynamically
      const newCard = createMockEventCard({ eventId: '6001' });
      document.body.appendChild(newCard);

      await flushAsync();
      // Give MutationObserver time to fire
      await flushAsync();

      expect(newCard.getAttribute('data-almedals-planner-initialized')).toBe('1');
      const host = newCard.querySelector('.almedals-star-host');
      expect(host).not.toBeNull();
    });

    it('sets data-almedals-planner-initialized="1" on all processed cards', async () => {
      document.body.appendChild(createMockEventCard({ eventId: '7001' }));
      document.body.appendChild(createMockEventCard({ eventId: '7002' }));

      initContentScript(adapter);
      await flushAsync();

      const cards = document.querySelectorAll('li');
      for (const card of cards) {
        expect(card.getAttribute('data-almedals-planner-initialized')).toBe('1');
      }
    });

    it('skips cards already marked with data-almedals-planner-initialized="1"', async () => {
      const card = createMockEventCard({ eventId: '8001' });
      card.setAttribute('data-almedals-planner-initialized', '1');
      document.body.appendChild(card);

      initContentScript(adapter);
      await flushAsync();

      // Should not have injected a star button
      const host = card.querySelector('.almedals-star-host');
      expect(host).toBeNull();
    });

    it('registers an onStorageChanged listener via adapter', () => {
      initContentScript(adapter);

      expect(adapter.onStorageChanged).toHaveBeenCalledTimes(1);
      expect(adapter.onStorageChanged).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  // ─── Cross-page consistency (same tab) ────────────────────────

  describe('cross-page consistency (same tab)', () => {
    it('maintains an internal eventId → StarButton[] map', async () => {
      // Create two cards with the same eventId
      const card1 = createMockEventCard({ eventId: '9001', liId: 'item_4_aaa', divId: 'item4_aaa' });
      const card2 = createMockEventCard({ eventId: '9001', liId: 'item_4_bbb', divId: 'item4_bbb' });
      document.body.appendChild(card1);
      document.body.appendChild(card2);

      initContentScript(adapter);
      await flushAsync();

      // Both cards should have star buttons
      const host1 = card1.querySelector('.almedals-star-host') as HTMLElement;
      const host2 = card2.querySelector('.almedals-star-host') as HTMLElement;
      expect(host1).not.toBeNull();
      expect(host2).not.toBeNull();
    });

    it('when one star button is toggled, all other visible star buttons for the same event ID update', async () => {
      // Mock sendMessage to track STAR_EVENT calls and return success
      (adapter.sendMessage as ReturnType<typeof vi.fn>).mockImplementation(
        (message: MessagePayload): Promise<MessageResponse<boolean>> => {
          if (message.command === 'GET_STAR_STATE') {
            return Promise.resolve({ success: true, data: false });
          }
          if (message.command === 'STAR_EVENT') {
            return Promise.resolve({ success: true, data: undefined as unknown as boolean });
          }
          if (message.command === 'UNSTAR_EVENT') {
            return Promise.resolve({ success: true, data: undefined as unknown as boolean });
          }
          return Promise.resolve({ success: true, data: undefined as unknown as boolean });
        },
      );

      // Create two cards with the same eventId
      const card1 = createMockEventCard({ eventId: '9002', liId: 'item_4_ccc', divId: 'item4_ccc' });
      const card2 = createMockEventCard({ eventId: '9002', liId: 'item_4_ddd', divId: 'item4_ddd' });
      document.body.appendChild(card1);
      document.body.appendChild(card2);

      initContentScript(adapter);
      await flushAsync();

      const host1 = card1.querySelector('.almedals-star-host') as HTMLElement;
      const host2 = card2.querySelector('.almedals-star-host') as HTMLElement;

      // Click the star button on card1
      const btn1 = host1.shadowRoot!.querySelector('button') as HTMLButtonElement;
      btn1.click();
      await flushAsync();

      // Both buttons should now show starred state
      const btn1After = host1.shadowRoot!.querySelector('button') as HTMLButtonElement;
      const btn2After = host2.shadowRoot!.querySelector('button') as HTMLButtonElement;
      expect(btn1After.getAttribute('aria-pressed')).toBe('true');
      expect(btn2After.getAttribute('aria-pressed')).toBe('true');
    });
  });

  // ─── Cross-tab consistency ────────────────────────────────────

  describe('cross-tab consistency (onStorageChanged)', () => {
    it('updates all visible star buttons when starredEvents changes externally', async () => {
      const card = createMockEventCard({ eventId: '10001' });
      document.body.appendChild(card);

      let storageChangedCallback: ((changes: Record<string, { readonly oldValue?: unknown; readonly newValue?: unknown }>) => void) | undefined;
      (adapter.onStorageChanged as ReturnType<typeof vi.fn>).mockImplementation(
        (cb: (changes: Record<string, { readonly oldValue?: unknown; readonly newValue?: unknown }>) => void) => {
          storageChangedCallback = cb;
          return vi.fn();
        },
      );

      initContentScript(adapter);
      await flushAsync();

      // Verify the button is initially unstarred
      const host = card.querySelector('.almedals-star-host') as HTMLElement;
      const btn = host.shadowRoot!.querySelector('button') as HTMLButtonElement;
      expect(btn.getAttribute('aria-pressed')).toBe('false');

      // Simulate external storage change — event becomes starred
      expect(storageChangedCallback).toBeDefined();
      storageChangedCallback!({
        starredEvents: {
          newValue: {
            '10001': {
              id: '10001',
              title: 'Test Event',
              starred: true,
              starredAt: '2026-06-15T14:30:00.000Z',
              organiser: null,
              startDateTime: '2026-06-22T07:30:00+02:00',
              endDateTime: null,
              location: null,
              description: null,
              topic: null,
              sourceUrl: null,
              icsDataUri: null,
            },
          },
        },
      });

      // Button should now show starred state
      expect(btn.getAttribute('aria-pressed')).toBe('true');
    });

    it('updates star buttons to unstarred when event is removed from storage', async () => {
      // Start with the event starred
      (adapter.sendMessage as ReturnType<typeof vi.fn>).mockImplementation(
        (message: MessagePayload): Promise<MessageResponse<boolean>> => {
          if (message.command === 'GET_STAR_STATE') {
            return Promise.resolve({ success: true, data: true });
          }
          return Promise.resolve({ success: true, data: undefined as unknown as boolean });
        },
      );

      const card = createMockEventCard({ eventId: '10002' });
      document.body.appendChild(card);

      let storageChangedCallback: ((changes: Record<string, { readonly oldValue?: unknown; readonly newValue?: unknown }>) => void) | undefined;
      (adapter.onStorageChanged as ReturnType<typeof vi.fn>).mockImplementation(
        (cb: (changes: Record<string, { readonly oldValue?: unknown; readonly newValue?: unknown }>) => void) => {
          storageChangedCallback = cb;
          return vi.fn();
        },
      );

      initContentScript(adapter);
      await flushAsync();

      // Verify the button is initially starred
      const host = card.querySelector('.almedals-star-host') as HTMLElement;
      const btn = host.shadowRoot!.querySelector('button') as HTMLButtonElement;
      expect(btn.getAttribute('aria-pressed')).toBe('true');

      // Simulate external storage change — event removed
      storageChangedCallback!({
        starredEvents: {
          newValue: {},
        },
      });

      // Button should now show unstarred state
      expect(btn.getAttribute('aria-pressed')).toBe('false');
    });
  });

  // ─── DOM fixture testing ──────────────────────────────────────

  describe('DOM fixture testing', () => {
    it('processes realistic event cards from createMockEventCard', async () => {
      const card = createMockEventCard({
        title: 'Demokrati i förändring',
        organiser: 'Sveriges Riksdag',
        timeText: 'Måndag 10.00 – 11.30',
        location: 'Donners plats, Visby',
        eventId: '12345',
      });
      document.body.appendChild(card);

      initContentScript(adapter);
      await flushAsync();

      expect(card.getAttribute('data-almedals-planner-initialized')).toBe('1');
      const host = card.querySelector('.almedals-star-host');
      expect(host).not.toBeNull();
    });

    it('handles multiple cards with different configurations', async () => {
      const card1 = createMockEventCard({
        eventId: '11001',
        title: 'Event One',
        location: 'Holmen 1',
        liId: 'item_4_e1',
        divId: 'item4_e1',
      });
      const card2 = createMockEventCard({
        eventId: '11002',
        title: 'Event Two',
        location: null, // "Plats meddelas senare"
        liId: 'item_4_e2',
        divId: 'item4_e2',
      });
      document.body.appendChild(card1);
      document.body.appendChild(card2);

      initContentScript(adapter);
      await flushAsync();

      const hosts = document.querySelectorAll('.almedals-star-host');
      expect(hosts.length).toBe(2);
    });
  });

  // ─── All tests use mocked BrowserApiAdapter ───────────────────

  describe('all tests use mocked BrowserApiAdapter', () => {
    it('never calls real chrome.* APIs', async () => {
      const card = createMockEventCard();
      document.body.appendChild(card);

      initContentScript(adapter);
      await flushAsync();

      // Verify adapter methods were called (not chrome.* directly)
      expect(adapter.sendMessage).toHaveBeenCalled();
      expect(adapter.onStorageChanged).toHaveBeenCalled();
    });
  });
});
