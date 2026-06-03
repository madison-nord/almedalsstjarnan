// Feature: event-data-refresh, Property 4: Update preserves immutable fields

/**
 * Property test: After starring an event via STAR_EVENT, sending UPDATE_STARRED_EVENT
 * with random mutable field values preserves the immutable fields (id, starred, starredAt)
 * unchanged in storage.
 *
 * Uses an in-memory storage mock to simulate real storage behavior.
 *
 * Validates: Requirements 2.1, 2.2, 2.3
 */

import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';

import type {
  IBrowserApiAdapter,
  StorageSchema,
  MessageResponseSuccess,
  StarredEvent,
} from '#core/types';

import { normalizedEventArb, mutableFieldsArb } from '#test/helpers/event-generators';

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

describe('Property 4: Update preserves immutable fields', () => {
  it('after STAR_EVENT and UPDATE_STARRED_EVENT, id/starred/starredAt remain unchanged', async () => {
    await fc.assert(
      fc.asyncProperty(
        normalizedEventArb,
        mutableFieldsArb,
        async (event, newMutableFields) => {
          const adapter = createInMemoryAdapter();

          // 1. Star the event
          const starResult = await handleMessage(adapter, {
            command: 'STAR_EVENT',
            event,
          });
          expect(starResult.success).toBe(true);

          // 2. Record the starredAt timestamp from GET_ALL_STARRED_EVENTS
          const getAllResult = await handleMessage(adapter, {
            command: 'GET_ALL_STARRED_EVENTS',
          });
          expect(getAllResult.success).toBe(true);

          const allEvents = (getAllResult as MessageResponseSuccess<StarredEvent[]>).data;
          const originalEvent = allEvents.find((e) => e.id === event.id);
          expect(originalEvent).toBeDefined();

          const originalStarredAt = originalEvent!.starredAt;
          const originalId = originalEvent!.id;
          const originalStarred = originalEvent!.starred;

          // 3. Send UPDATE_STARRED_EVENT with random new mutable field values
          const updateResult = await handleMessage(adapter, {
            command: 'UPDATE_STARRED_EVENT',
            eventId: event.id,
            title: newMutableFields.title,
            organiser: newMutableFields.organiser,
            startDateTime: newMutableFields.startDateTime,
            endDateTime: newMutableFields.endDateTime,
            location: newMutableFields.location,
            description: newMutableFields.description,
            topic: newMutableFields.topic,
            sourceUrl: newMutableFields.sourceUrl,
            icsDataUri: newMutableFields.icsDataUri,
          });
          expect(updateResult.success).toBe(true);

          // 4. Query the event again
          const getAllAfterUpdate = await handleMessage(adapter, {
            command: 'GET_ALL_STARRED_EVENTS',
          });
          expect(getAllAfterUpdate.success).toBe(true);

          const updatedEvents = (getAllAfterUpdate as MessageResponseSuccess<StarredEvent[]>).data;
          const updatedEvent = updatedEvents.find((e) => e.id === event.id);
          expect(updatedEvent).toBeDefined();

          // 5. Assert immutable fields are unchanged
          expect(updatedEvent!.id).toBe(originalId);
          expect(updatedEvent!.starred).toBe(originalStarred);
          expect(updatedEvent!.starredAt).toBe(originalStarredAt);
        },
      ),
      { numRuns: 100 },
    );
  });
});
