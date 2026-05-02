// Feature: almedals-planner-extension, Property 16: Background sort order round-trip
// Validates: Requirements 7.6, 7.7

/**
 * Property test: SET_SORT_ORDER then GET_SORT_ORDER returns the same value.
 *
 * Uses an in-memory storage mock to simulate real storage behavior
 * and verifies the round-trip invariant across all valid sort orders.
 */

import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';

import type { IBrowserApiAdapter, StorageSchema, SortOrder, MessageResponseSuccess } from '#core/types';

import { sortOrderArb } from '#test/helpers/event-generators';

import { handleMessage } from '#extension/background';

/**
 * Creates a mock adapter backed by an in-memory storage object.
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

describe('Property 16: Background sort order round-trip', () => {
  it('SET_SORT_ORDER then GET_SORT_ORDER returns the same value', async () => {
    await fc.assert(
      fc.asyncProperty(sortOrderArb, async (order) => {
        const adapter = createInMemoryAdapter();

        // Set the sort order
        const setResult = await handleMessage(adapter, {
          command: 'SET_SORT_ORDER',
          sortOrder: order,
        });
        expect(setResult.success).toBe(true);

        // Get the sort order back
        const getResult = await handleMessage(adapter, {
          command: 'GET_SORT_ORDER',
        });

        expect(getResult.success).toBe(true);
        const data = (getResult as MessageResponseSuccess<SortOrder>).data;
        expect(data).toBe(order);
      }),
      { numRuns: 100 },
    );
  });

  it('GET_SORT_ORDER returns "chronological" when no sort order has been set', async () => {
    const adapter = createInMemoryAdapter();

    const result = await handleMessage(adapter, {
      command: 'GET_SORT_ORDER',
    });

    expect(result.success).toBe(true);
    const data = (result as MessageResponseSuccess<SortOrder>).data;
    expect(data).toBe('chronological');
  });
});
