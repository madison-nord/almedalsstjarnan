// Feature: event-data-refresh, Property 6: No update message for non-starred events

/**
 * Property test: Sending UPDATE_STARRED_EVENT for an event id that is not
 * in storage returns { success: true, data: undefined } and does not modify
 * storage (no new keys written).
 *
 * Uses an in-memory storage mock to simulate real storage behavior.
 *
 * Validates: Requirements 6.4
 */

import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';

import type { IBrowserApiAdapter, StorageSchema } from '#core/types';

import { normalizedEventArb } from '#test/helpers/event-generators';

import { handleMessage } from '#extension/background';

/**
 * Creates a mock adapter backed by an empty in-memory storage object.
 * Tracks calls to storageLocalSet for asserting no writes occur.
 */
function createEmptyInMemoryAdapter(): IBrowserApiAdapter {
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

describe('Property 6: No update message for non-starred events', () => {
  it('UPDATE_STARRED_EVENT for a non-starred event returns success with undefined data and does not write to storage', async () => {
    await fc.assert(
      fc.asyncProperty(normalizedEventArb, async (event) => {
        const adapter = createEmptyInMemoryAdapter();

        // Send UPDATE_STARRED_EVENT for an event id that is not in storage
        const result = await handleMessage(adapter, {
          command: 'UPDATE_STARRED_EVENT',
          eventId: event.id,
          title: event.title,
          organiser: event.organiser,
          startDateTime: event.startDateTime,
          endDateTime: event.endDateTime,
          location: event.location,
          description: event.description,
          topic: event.topic,
          sourceUrl: event.sourceUrl,
          icsDataUri: event.icsDataUri,
        });

        // Assert response is { success: true, data: undefined }
        expect(result).toEqual({ success: true, data: undefined });

        // Assert storageLocalSet was NOT called (no writes to storage)
        expect(adapter.storageLocalSet).not.toHaveBeenCalled();

        // Double-check: GET_ALL_STARRED_EVENTS should return empty array
        const allResult = await handleMessage(adapter, {
          command: 'GET_ALL_STARRED_EVENTS',
        });
        expect(allResult).toEqual({ success: true, data: [] });
      }),
      { numRuns: 100 },
    );
  });
});
