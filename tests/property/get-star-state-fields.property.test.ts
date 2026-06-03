// Feature: event-data-refresh, Property 5: GET_STAR_STATE returns stored mutable fields for starred events

/**
 * Property test: After starring an event via STAR_EVENT, sending GET_STAR_STATE
 * returns starred: true and storedFields matching each of the 9 mutable fields
 * from the original event.
 *
 * Uses an in-memory storage mock to simulate real storage behavior.
 *
 * Validates: Requirements 4.1
 */

import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';

import type {
  IBrowserApiAdapter,
  StorageSchema,
  MessageResponseSuccess,
  GetStarStateData,
} from '#core/types';
import { MUTABLE_FIELDS } from '#core/event-field-comparator';

import { normalizedEventArb } from '#test/helpers/event-generators';

import { handleMessage } from '#extension/background';

/**
 * Creates a mock adapter backed by an in-memory storage object.
 * This allows property tests to exercise the full read-write cycle.
 */
function createInMemoryAdapter(): IBrowserApiAdapter {
  const storage: Partial<StorageSchema> = {};

  return {
    storageLocalGet: vi.fn().mockImplementation(<K extends keyof StorageSchema>(keys: K[]) => {
      const result: Partial<StorageSchema> = {};
      for (const key of keys) {
        if (key in storage) {
          (result as Record<string, unknown>)[key] = storage[key];
        }
      }
      return Promise.resolve(result);
    }),
    storageLocalSet: vi.fn().mockImplementation((items: Partial<StorageSchema>) => {
      Object.assign(storage, items);
      return Promise.resolve();
    }),
    sendMessage: vi.fn(),
    getMessage: vi.fn().mockReturnValue(''),
    download: vi.fn(),
    createTab: vi.fn(),
    onStorageChanged: vi.fn().mockReturnValue(() => undefined),
  };
}

describe('Property 5: GET_STAR_STATE returns stored mutable fields for starred events', () => {
  it('after STAR_EVENT, GET_STAR_STATE returns starred: true and storedFields matching original event mutable fields', async () => {
    await fc.assert(
      fc.asyncProperty(normalizedEventArb, async (event) => {
        const adapter = createInMemoryAdapter();

        // Star the event
        const starResult = await handleMessage(adapter, {
          command: 'STAR_EVENT',
          event,
        });
        expect(starResult.success).toBe(true);

        // Query star state
        const stateResult = await handleMessage(adapter, {
          command: 'GET_STAR_STATE',
          eventId: event.id,
        });

        expect(stateResult.success).toBe(true);

        const data = (stateResult as MessageResponseSuccess<GetStarStateData>).data;
        expect(data.starred).toBe(true);
        expect(data.storedFields).not.toBeNull();

        // Assert each of the 9 mutable fields matches the original event
        for (const field of MUTABLE_FIELDS) {
          expect(data.storedFields![field]).toBe(event[field]);
        }
      }),
      { numRuns: 100 },
    );
  });
});
