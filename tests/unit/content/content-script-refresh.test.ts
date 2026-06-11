/**
 * Unit tests for content script refresh integration.
 *
 * Tests the refresh mechanism that detects when starred event data
 * has changed on the page and sends UPDATE_STARRED_EVENT to the background.
 *
 * Requirements: 1.1, 1.2, 1.4, 1.5, 6.2, 6.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import type {
  IBrowserApiAdapter,
  MessagePayload,
  MessageResponse,
  GetStarStateData,
} from '#core/types';
import type { MutableFields } from '#core/event-field-comparator';
import { normalizeEvent } from '#core/event-normalizer';
import { processEventCard } from '#extension/content-script';
import { mockBrowserApi, resetMocks } from '#test/helpers/mock-browser-api';
import { createMockEventCard } from '#test/helpers/dom-helpers';

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Compute the expected description from the default mock card.
 * This ensures the stored fields always match what normalizeEvent produces.
 */
function getDefaultDescription(): string | null {
  const card = createMockEventCard();
  const result = normalizeEvent(card);
  if (result.ok) return result.event.description;
  return null;
}

/** Default stored fields matching what normalizeEvent produces from the default mock event card */
const DEFAULT_STORED_FIELDS: MutableFields = {
  title: 'Tillräcklighet krävs för att klara klimatkrisen',
  organiser: 'Den gröna tankesmedjan Cogito',
  startDateTime: '2026-06-22T07:30:00+02:00',
  endDateTime: '2026-06-22T08:30:00+02:00',
  location: 'Holmen 1',
  description: getDefaultDescription(),
  topic: 'Hållbarhet, Ekonomi',
  sourceUrl: 'https://almedalsveckan.info/rg/almedalsveckan/evenemang-almedalsveckan/2026/8363',
  icsDataUri:
    'data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0AURL:https://almedalsveckan.info/rg/almedalsveckan/evenemang-almedalsveckan/2026/8363%0ADTSTART:20260622T073000%0ADTEND:20260622T083000%0ASUMMARY:Tillr%C3%A4cklighet%20kr%C3%A4vs%20f%C3%B6r%20att%20klara%20klimatkrisen%0ADESCRIPTION:Efter%20en%20kort%20inledning%20bjuder%20vi%20in%20till%20ett%20samtal%20ombord%20p%C3%A5%20b%C3%A5ten%20Vagabonde.%20Varmt%20v%C3%A4lkommen!%0ALOCATION:Holmen%201%0AEND:VEVENT%0AEND:VCALENDAR',
};

function setupAdapter(starStateResponse: GetStarStateData): IBrowserApiAdapter {
  const adapter = mockBrowserApi;
  (adapter.getMessage as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
    if (key === 'starEvent') return 'Star event';
    if (key === 'unstarEvent') return 'Unstar event';
    return '';
  });
  (adapter.sendMessage as ReturnType<typeof vi.fn>).mockImplementation(
    (message: MessagePayload): Promise<MessageResponse<unknown>> => {
      if (message.command === 'GET_STAR_STATE') {
        return Promise.resolve({ success: true, data: starStateResponse });
      }
      if (message.command === 'UPDATE_STARRED_EVENT') {
        return Promise.resolve({ success: true, data: undefined });
      }
      return Promise.resolve({ success: true, data: undefined });
    },
  );
  return adapter;
}

/** Extract calls to sendMessage that match a given command */
function getCallsForCommand(adapter: IBrowserApiAdapter, command: string): unknown[][] {
  const calls = (adapter.sendMessage as ReturnType<typeof vi.fn>).mock.calls as unknown[][];
  return calls.filter((call) => {
    const msg = call[0] as MessagePayload | undefined;
    return msg?.command === command;
  });
}

/** Flush microtasks so fire-and-forget refresh can complete */
async function flushAsync(): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

describe('Content Script - Refresh Integration', () => {
  beforeEach(() => {
    resetMocks();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  // ─── Requirement 6.4: Refresh only for starred events ─────────

  describe('refresh is called only for starred events', () => {
    it('does not send UPDATE_STARRED_EVENT when event is not starred', async () => {
      const adapter = setupAdapter({ starred: false, storedFields: null });
      const card = createMockEventCard();
      document.body.appendChild(card);

      await processEventCard(card, adapter);
      await flushAsync();

      const updateCalls = getCallsForCommand(adapter, 'UPDATE_STARRED_EVENT');
      expect(updateCalls).toHaveLength(0);
    });
  });

  // ─── Requirement 1.1: Refresh skipped when storedFields is null ─

  describe('refresh skipped when storedFields is null', () => {
    it('does not send UPDATE_STARRED_EVENT when starred but storedFields is null', async () => {
      const adapter = setupAdapter({ starred: true, storedFields: null });
      const card = createMockEventCard();
      document.body.appendChild(card);

      await processEventCard(card, adapter);
      await flushAsync();

      const updateCalls = getCallsForCommand(adapter, 'UPDATE_STARRED_EVENT');
      expect(updateCalls).toHaveLength(0);
    });
  });

  // ─── Requirement 1.4: UPDATE_STARRED_EVENT sent when fields differ ─

  describe('UPDATE_STARRED_EVENT sent when fields differ', () => {
    it('sends UPDATE_STARRED_EVENT when stored title differs from DOM', async () => {
      const storedFields: MutableFields = {
        ...DEFAULT_STORED_FIELDS,
        title: 'Old Title That Has Changed',
      };
      const adapter = setupAdapter({ starred: true, storedFields });
      const card = createMockEventCard();
      document.body.appendChild(card);

      await processEventCard(card, adapter);
      await flushAsync();

      const updateCalls = getCallsForCommand(adapter, 'UPDATE_STARRED_EVENT');
      expect(updateCalls).toHaveLength(1);
      expect(updateCalls[0]![0]).toMatchObject({
        command: 'UPDATE_STARRED_EVENT',
        eventId: expect.any(String),
        title: 'Tillräcklighet krävs för att klara klimatkrisen',
      });
    });

    it('sends UPDATE_STARRED_EVENT when stored location differs from DOM', async () => {
      const storedFields: MutableFields = {
        ...DEFAULT_STORED_FIELDS,
        location: 'Some Old Location',
      };
      const adapter = setupAdapter({ starred: true, storedFields });
      const card = createMockEventCard();
      document.body.appendChild(card);

      await processEventCard(card, adapter);
      await flushAsync();

      const updateCalls = getCallsForCommand(adapter, 'UPDATE_STARRED_EVENT');
      expect(updateCalls).toHaveLength(1);
      expect(updateCalls[0]![0]).toMatchObject({
        command: 'UPDATE_STARRED_EVENT',
        location: 'Holmen 1',
      });
    });
  });

  // ─── Requirement 1.5: No message sent when fields match ────────

  describe('no message sent when fields match', () => {
    it('does not send UPDATE_STARRED_EVENT when all fields match stored data', async () => {
      const adapter = setupAdapter({ starred: true, storedFields: DEFAULT_STORED_FIELDS });
      const card = createMockEventCard();
      document.body.appendChild(card);

      await processEventCard(card, adapter);
      await flushAsync();

      const updateCalls = getCallsForCommand(adapter, 'UPDATE_STARRED_EVENT');
      expect(updateCalls).toHaveLength(0);
    });
  });

  // ─── Requirement 6.2: Failure logged and star button state unchanged ─

  describe('failure logged and star button state unchanged on error', () => {
    it('logs warning and retains star button state when UPDATE_STARRED_EVENT throws', async () => {
      const storedFields: MutableFields = {
        ...DEFAULT_STORED_FIELDS,
        title: 'Old Title',
      };
      const adapter = setupAdapter({ starred: true, storedFields });

      // Override sendMessage to throw on UPDATE_STARRED_EVENT
      (adapter.sendMessage as ReturnType<typeof vi.fn>).mockImplementation(
        (message: MessagePayload): Promise<MessageResponse<unknown>> => {
          if (message.command === 'GET_STAR_STATE') {
            return Promise.resolve({ success: true, data: { starred: true, storedFields } });
          }
          if (message.command === 'UPDATE_STARRED_EVENT') {
            return Promise.reject(new Error('Network error'));
          }
          return Promise.resolve({ success: true, data: undefined });
        },
      );

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const card = createMockEventCard();
      document.body.appendChild(card);

      await processEventCard(card, adapter);
      await flushAsync();

      // Verify warning was logged
      expect(warnSpy).toHaveBeenCalledWith(
        '[Almedalsstjärnan] Refresh comparison failed for event:',
        expect.any(String),
      );

      // Verify star button still shows starred state (unchanged)
      const host = card.querySelector('.almedals-star-host') as HTMLElement;
      const btn = host.shadowRoot!.querySelector('button') as HTMLButtonElement;
      expect(btn.getAttribute('aria-pressed')).toBe('true');

      warnSpy.mockRestore();
    });
  });

  // ─── Requirement 1.2: Normalization failure logs warning and skips refresh ─

  describe('normalization failure logs warning and skips refresh', () => {
    it('logs warning and skips refresh when normalizeEvent fails on card', async () => {
      const adapter = setupAdapter({ starred: true, storedFields: DEFAULT_STORED_FIELDS });
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Create a malformed card that will fail normalization (missing title text)
      const li = document.createElement('li');
      li.id = 'item_4_malformed';
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
      await flushAsync();

      // Should have logged a warning about skipping the card
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Almedalsstjärnan] Skipping card:'),
      );

      // Should NOT have sent UPDATE_STARRED_EVENT
      const updateCalls = getCallsForCommand(adapter, 'UPDATE_STARRED_EVENT');
      expect(updateCalls).toHaveLength(0);

      // Should NOT have sent GET_STAR_STATE (normalization fails before that)
      const getStarCalls = getCallsForCommand(adapter, 'GET_STAR_STATE');
      expect(getStarCalls).toHaveLength(0);

      warnSpy.mockRestore();
    });
  });
});
