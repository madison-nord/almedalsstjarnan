// Feature: event-data-refresh, Property 7: Concurrent updates via mutex preserve all writes

/**
 * Property test: When multiple UPDATE_STARRED_EVENT messages targeting different
 * event ids are fired concurrently, the storage mutex ensures each event's final
 * stored state reflects its most recent update and no writes are lost.
 *
 * Uses an in-memory storage mock to simulate real storage behavior.
 *
 * Validates: Requirements 3.3
 */

import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';

import type {
  IBrowserApiAdapter,
  StorageSchema,
  StarredEvent,
  MessageResponseSuccess,
} from '#core/types';
import { MUTABLE_FIELDS } from '#core/event-field-comparator';

import { starredEventArrayArb, mutableFieldsArb } from '#test/helpers/event-generators';

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

describe('Property 7: Concurrent updates via mutex preserve all writes', () => {
  it('concurrent UPDATE_STARRED_EVENT messages for different event ids preserve all writes', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate 2-5 unique starred events
        starredEventArrayArb
          .filter((events) => events.length >= 2 && events.length <= 5)
          .map((events) => events.slice(0, 5)),
        // Generate mutable fields arrays (one per event, up to 5)
        fc.array(mutableFieldsArb, { minLength: 5, maxLength: 5 }),
        async (events, mutableFieldsArray) => {
          const adapter = createInMemoryAdapter();

          // Star all events sequentially
          for (const event of events) {
            const result = await handleMessage(adapter, {
              command: 'STAR_EVENT',
              event,
            });
            expect(result.success).toBe(true);
          }

          // Capture the actual starredAt values assigned by the handler
          const getBeforeResult = await handleMessage(adapter, {
            command: 'GET_ALL_STARRED_EVENTS',
          });
          const eventsBefore = (getBeforeResult as MessageResponseSuccess<StarredEvent[]>).data;
          const starredAtMap = new Map<string, string>();
          for (const e of eventsBefore) {
            starredAtMap.set(e.id, e.starredAt);
          }

          // Build concurrent UPDATE_STARRED_EVENT payloads for each event
          const updatePromises = events.map((event, index) => {
            const fields = mutableFieldsArray[index]!;
            return handleMessage(adapter, {
              command: 'UPDATE_STARRED_EVENT',
              eventId: event.id,
              title: fields.title,
              organiser: fields.organiser,
              startDateTime: fields.startDateTime,
              endDateTime: fields.endDateTime,
              location: fields.location,
              description: fields.description,
              topic: fields.topic,
              sourceUrl: fields.sourceUrl,
              icsDataUri: fields.icsDataUri,
            });
          });

          // Fire ALL update messages concurrently
          const results = await Promise.all(updatePromises);

          // Assert all updates succeeded
          for (const result of results) {
            expect(result.success).toBe(true);
          }

          // Query all starred events to verify final state
          const getAllResult = await handleMessage(adapter, {
            command: 'GET_ALL_STARRED_EVENTS',
          });
          expect(getAllResult.success).toBe(true);

          const allEvents = (getAllResult as MessageResponseSuccess<StarredEvent[]>).data;

          // Assert no events were lost (count matches)
          expect(allEvents).toHaveLength(events.length);

          // Assert each event has the updated mutable fields from its respective update payload
          for (let i = 0; i < events.length; i++) {
            const originalEvent = events[i]!;
            const expectedFields = mutableFieldsArray[i]!;
            const storedEvent = allEvents.find((e) => e.id === originalEvent.id);

            expect(storedEvent).toBeDefined();

            // Verify all mutable fields were updated
            for (const field of MUTABLE_FIELDS) {
              expect(storedEvent![field]).toBe(expectedFields[field]);
            }

            // Verify immutable fields are preserved
            expect(storedEvent!.id).toBe(originalEvent.id);
            expect(storedEvent!.starred).toBe(true);
            expect(storedEvent!.starredAt).toBe(starredAtMap.get(originalEvent.id));
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
