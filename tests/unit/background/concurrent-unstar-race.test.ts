/**
 * Unit test: Concurrent UNSTAR_EVENT race condition in background.
 *
 * When multiple UNSTAR_EVENT messages arrive simultaneously (e.g., bulk unstar),
 * each removeStarredEvent call reads the same storage snapshot, removes one event,
 * and writes back. The last write wins, restoring events that earlier writes removed.
 *
 * // Feature: unstar-revert-bug, Concurrent storage write race
 *
 * Validates: Requirements 2.3
 */

import { describe, it, expect, vi } from 'vitest';

import { handleMessage } from '#extension/background';
import type { IBrowserApiAdapter, StarredEvent } from '#core/types';

function makeStarredEvent(id: string): StarredEvent {
  return {
    id,
    title: `Event ${id}`,
    description: null,
    location: 'Visby',
    organiser: 'Test Org',
    topic: null,
    startDateTime: '2026-06-28T10:00:00+02:00',
    endDateTime: '2026-06-28T11:00:00+02:00',
    sourceUrl: `https://example.com/${id}`,
    icsDataUri: null,
    starred: true,
    starredAt: '2026-06-01T10:00:00.000Z',
  };
}

describe('Background: concurrent UNSTAR_EVENT race condition', () => {
  it('all events are removed when 3 UNSTAR_EVENT messages arrive simultaneously', async () => {
    // Simulate storage with 3 events
    let storage: Record<string, Record<string, StarredEvent>> = {
      starredEvents: {
        'event-1': makeStarredEvent('event-1'),
        'event-2': makeStarredEvent('event-2'),
        'event-3': makeStarredEvent('event-3'),
      },
    };

    const mockAdapter: IBrowserApiAdapter = {
      storageLocalGet: vi.fn().mockImplementation(async () => {
        // Simulate a small delay to allow concurrent reads
        await Promise.resolve();
        return { ...storage };
      }),
      storageLocalSet: vi.fn().mockImplementation(async (data: Record<string, unknown>) => {
        storage = { ...storage, ...data } as typeof storage;
      }),
      sendMessage: vi.fn().mockResolvedValue({ success: true, data: undefined }),
      getMessage: vi.fn().mockReturnValue(''),
      download: vi.fn().mockResolvedValue(1),
      createTab: vi.fn().mockResolvedValue(undefined),
      onStorageChanged: vi.fn().mockReturnValue(() => {}),
    };

    // Send 3 UNSTAR_EVENT messages concurrently (simulating bulk unstar)
    const results = await Promise.all([
      handleMessage(mockAdapter, { command: 'UNSTAR_EVENT', eventId: 'event-1' }),
      handleMessage(mockAdapter, { command: 'UNSTAR_EVENT', eventId: 'event-2' }),
      handleMessage(mockAdapter, { command: 'UNSTAR_EVENT', eventId: 'event-3' }),
    ]);

    // All should succeed
    for (const result of results) {
      expect(result.success).toBe(true);
    }

    // CRITICAL: ALL events should be removed from storage
    const remaining = storage.starredEvents ?? {};
    expect(
      Object.keys(remaining).length,
      `Expected 0 events in storage but found: ${Object.keys(remaining).join(', ')}`,
    ).toBe(0);
  });

  it('5 concurrent unstar operations all succeed', async () => {
    let storage: Record<string, Record<string, StarredEvent>> = {
      starredEvents: {
        'e1': makeStarredEvent('e1'),
        'e2': makeStarredEvent('e2'),
        'e3': makeStarredEvent('e3'),
        'e4': makeStarredEvent('e4'),
        'e5': makeStarredEvent('e5'),
      },
    };

    const mockAdapter: IBrowserApiAdapter = {
      storageLocalGet: vi.fn().mockImplementation(async () => {
        await Promise.resolve();
        return { ...storage };
      }),
      storageLocalSet: vi.fn().mockImplementation(async (data: Record<string, unknown>) => {
        storage = { ...storage, ...data } as typeof storage;
      }),
      sendMessage: vi.fn().mockResolvedValue({ success: true, data: undefined }),
      getMessage: vi.fn().mockReturnValue(''),
      download: vi.fn().mockResolvedValue(1),
      createTab: vi.fn().mockResolvedValue(undefined),
      onStorageChanged: vi.fn().mockReturnValue(() => {}),
    };

    // Send 5 concurrent UNSTAR_EVENT messages
    await Promise.all([
      handleMessage(mockAdapter, { command: 'UNSTAR_EVENT', eventId: 'e1' }),
      handleMessage(mockAdapter, { command: 'UNSTAR_EVENT', eventId: 'e2' }),
      handleMessage(mockAdapter, { command: 'UNSTAR_EVENT', eventId: 'e3' }),
      handleMessage(mockAdapter, { command: 'UNSTAR_EVENT', eventId: 'e4' }),
      handleMessage(mockAdapter, { command: 'UNSTAR_EVENT', eventId: 'e5' }),
    ]);

    expect(Object.keys(storage.starredEvents ?? {}).length).toBe(0);
  });
});
