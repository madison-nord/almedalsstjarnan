// Feature: almedals-planner-extension, Property 15: Background star/unstar round-trip
// Validates: Requirements 7.2, 7.3, 7.4

/**
 * Property test: STAR_EVENT then GET_STAR_STATE returns true,
 * then UNSTAR_EVENT then GET_STAR_STATE returns false.
 *
 * Uses an in-memory storage mock to simulate real storage behavior
 * and verifies the round-trip invariant across arbitrary events.
 */

import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';

import type {
  IBrowserApiAdapter,
  StorageSchema,
  StarredEvent,
  MessageResponseSuccess,
} from '#core/types';

import { normalizedEventArb } from '#test/helpers/event-generators';

import { handleMessage } from '#extension/background';

/**
 * Creates a mock adapter backed by an in-memory storage object.
 * This allows property tests to exercise the full read-write cycle.
 */
function createInMemoryAdapter(): IBrowserApiAdapter {
  const storage: Partial<StorageSchema> = {};

  return {
    storageLocalGet: vi.fn().mockImplementation(
      <K extends keyof StorageSchema>(keys: K[]) => {
        const result: Partial<StorageSchema> = {};
        for (const key of keys) {
          if (key in storage) {
            (result as Record<string, unknown>)[key] = storage[key];
          }
        }
        return Promise.resolve(result);
      },
    ),
    storageLocalSet: vi.fn().mockImplementation(
      (items: Partial<StorageSchema>) => {
        Object.assign(storage, items);
        return Promise.resolve();
      },
    ),
    sendMessage: vi.fn(),
    getMessage: vi.fn().mockReturnValue(''),
    download: vi.fn(),
    createTab: vi.fn(),
    onStorageChanged: vi.fn().mockReturnValue(() => undefined),
  };
}

describe('Property 15: Background star/unstar round-trip', () => {
  it('STAR_EVENT → GET_STAR_STATE returns true, UNSTAR_EVENT → GET_STAR_STATE returns false', async () => {
    await fc.assert(
      fc.asyncProperty(normalizedEventArb, async (event) => {
        const adapter = createInMemoryAdapter();

        // Star the event
        const starResult = await handleMessage(adapter, {
          command: 'STAR_EVENT',
          event,
        });
        expect(starResult.success).toBe(true);

        // Verify it's starred
        const stateAfterStar = await handleMessage(adapter, {
          command: 'GET_STAR_STATE',
          eventId: event.id,
        });
        expect(stateAfterStar).toEqual({ success: true, data: true });

        // Unstar the event
        const unstarResult = await handleMessage(adapter, {
          command: 'UNSTAR_EVENT',
          eventId: event.id,
        });
        expect(unstarResult.success).toBe(true);

        // Verify it's no longer starred
        const stateAfterUnstar = await handleMessage(adapter, {
          command: 'GET_STAR_STATE',
          eventId: event.id,
        });
        expect(stateAfterUnstar).toEqual({ success: true, data: false });
      }),
      { numRuns: 100 },
    );
  });

  it('starred event appears in GET_ALL_STARRED_EVENTS after STAR_EVENT', async () => {
    await fc.assert(
      fc.asyncProperty(normalizedEventArb, async (event) => {
        const adapter = createInMemoryAdapter();

        await handleMessage(adapter, {
          command: 'STAR_EVENT',
          event,
        });

        const allResult = await handleMessage(adapter, {
          command: 'GET_ALL_STARRED_EVENTS',
        });

        expect(allResult.success).toBe(true);
        const data = (allResult as MessageResponseSuccess<StarredEvent[]>).data;
        expect(data.some((e) => e.id === event.id)).toBe(true);

        const found = data.find((e) => e.id === event.id);
        expect(found?.starred).toBe(true);
        expect(found?.starredAt).toBeDefined();
        // starredAt should be a valid ISO 8601 UTC timestamp
        expect(new Date(found!.starredAt).toISOString()).toBe(found!.starredAt);
      }),
      { numRuns: 100 },
    );
  });
});
