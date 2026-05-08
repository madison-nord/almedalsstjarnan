/**
 * Custom hook encapsulating starred events fetch, sort, undo, and live update logic
 * for the Popup UI.
 *
 * - Fetches starred events via GET_ALL_STARRED_EVENTS on mount
 * - Fetches sort order via GET_SORT_ORDER on mount
 * - Sorts events using sortEvents from #core/sorter
 * - Provides changeSortOrder that sends SET_SORT_ORDER and re-sorts
 * - Provides unstarEvent with deferred deletion (undo support)
 * - Provides undoUnstar to restore a pending-deletion event
 * - Provides confirmUnstar to permanently remove a pending-deletion event
 * - Registers adapter.onStorageChanged for live updates
 * - Cleans up the storage listener on unmount
 *
 * Requirements: 9.2, 9.3, 9.5, 9.6, 7.1, 7.2, 7.3
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

import type {
  IBrowserApiAdapter,
  StarredEvent,
  SortOrder,
  GetAllStarredEventsResponse,
  GetSortOrderResponse,
} from '#core/types';
import { DEFAULT_SORT_ORDER } from '#core/types';
import { sortEvents } from '#core/sorter';
import { generateICS, generateExportFilename } from '#core/ics-generator';
import { detectConflicts } from '#core/conflict-detector';

export interface UseStarredEventsResult {
  readonly events: readonly StarredEvent[];
  readonly sortOrder: SortOrder;
  readonly changeSortOrder: (order: SortOrder) => void;
  readonly unstarEvent: (eventId: string) => void;
  readonly undoUnstar: (eventId: string) => void;
  readonly confirmUnstar: (eventId: string) => void;
  readonly pendingDeletions: readonly StarredEvent[];
  readonly exportEvents: () => void;
  readonly loading: boolean;
  readonly conflictingIds: ReadonlySet<string>;
  readonly conflictTitlesMap: ReadonlyMap<string, readonly string[]>;
}

export function useStarredEvents(
  adapter: IBrowserApiAdapter,
): UseStarredEventsResult {
  const [events, setEvents] = useState<readonly StarredEvent[]>([]);
  const [sortOrder, setSortOrder] = useState<SortOrder>(DEFAULT_SORT_ORDER);
  const [loading, setLoading] = useState(true);
  const [pendingDeletions, setPendingDeletions] = useState<StarredEvent[]>([]);
  const sortOrderRef = useRef<SortOrder>(DEFAULT_SORT_ORDER);
  const pendingDeletionsRef = useRef<Set<string>>(new Set());

  const fetchEvents = useCallback(
    async (order: SortOrder): Promise<void> => {
      const response =
        await adapter.sendMessage<StarredEvent[]>({
          command: 'GET_ALL_STARRED_EVENTS',
        }) as GetAllStarredEventsResponse;

      if (response.success) {
        const pendingIds = pendingDeletionsRef.current;
        if (pendingIds.size > 0) {
          const storageIds = new Set(response.data.map((e) => e.id));
          // Clean up IDs that are no longer in storage (background confirmed removal)
          for (const id of pendingIds) {
            if (!storageIds.has(id)) {
              pendingIds.delete(id);
            }
          }
          const filtered = pendingIds.size > 0
            ? response.data.filter((e) => !pendingIds.has(e.id))
            : response.data;
          const sorted = sortEvents(filtered, order);
          setEvents(sorted);
        } else {
          const sorted = sortEvents(response.data, order);
          setEvents(sorted);
        }
      }
    },
    [adapter],
  );

  useEffect(() => {
    let cancelled = false;

    async function init(): Promise<void> {
      const [eventsResponse, sortResponse] = await Promise.all([
        adapter.sendMessage<StarredEvent[]>({
          command: 'GET_ALL_STARRED_EVENTS',
        }) as Promise<GetAllStarredEventsResponse>,
        adapter.sendMessage<SortOrder>({
          command: 'GET_SORT_ORDER',
        }) as Promise<GetSortOrderResponse>,
      ]);

      if (cancelled) return;

      const order = sortResponse.success
        ? sortResponse.data
        : DEFAULT_SORT_ORDER;

      setSortOrder(order);
      sortOrderRef.current = order;

      if (eventsResponse.success) {
        const sorted = sortEvents(eventsResponse.data, order);
        setEvents(sorted);
      }

      setLoading(false);
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, [adapter]);

  useEffect(() => {
    const unsubscribe = adapter.onStorageChanged((changes) => {
      if ('starredEvents' in changes) {
        void fetchEvents(sortOrderRef.current);
      }
    });

    return unsubscribe;
  }, [adapter, fetchEvents]);

  const changeSortOrder = useCallback(
    (order: SortOrder): void => {
      setSortOrder(order);
      sortOrderRef.current = order;

      void adapter.sendMessage({ command: 'SET_SORT_ORDER', sortOrder: order });

      setEvents((prev) => sortEvents([...prev], order));
    },
    [adapter],
  );

  const unstarEvent = useCallback(
    (eventId: string): void => {
      pendingDeletionsRef.current.add(eventId);
      // Find the event before removing it
      setEvents((prev) => {
        const event = prev.find((e) => e.id === eventId);
        if (event) {
          setPendingDeletions((pd) => [...pd, event]);
        }
        return prev.filter((e) => e.id !== eventId);
      });
    },
    [],
  );

  const undoUnstar = useCallback(
    (eventId: string): void => {
      pendingDeletionsRef.current.delete(eventId);
      setPendingDeletions((prev) => {
        const event = prev.find((e) => e.id === eventId);
        if (event) {
          // Re-add to displayed events and re-sort
          setEvents((currentEvents) =>
            sortEvents([...currentEvents, event], sortOrderRef.current),
          );
          // Re-star in storage
          void adapter.sendMessage({ command: 'STAR_EVENT', event });
        }
        return prev.filter((e) => e.id !== eventId);
      });
    },
    [adapter],
  );

  const confirmUnstar = useCallback(
    (eventId: string): void => {
      // Keep eventId in pendingDeletionsRef — it will be cleaned up by fetchEvents
      // once the background has actually removed the event from storage.
      // This prevents the race condition where a storage change fires between
      // confirmUnstar and the background processing UNSTAR_EVENT.
      setPendingDeletions((prev) => prev.filter((e) => e.id !== eventId));
      // Now actually send the UNSTAR_EVENT to background
      void adapter.sendMessage({ command: 'UNSTAR_EVENT', eventId });
    },
    [adapter],
  );

  const exportEvents = useCallback((): void => {
    const icsContent = generateICS([...events], 'sv');
    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const blobUrl = URL.createObjectURL(blob);
    const filename = generateExportFilename();

    void adapter.download({ url: blobUrl, filename }).then(() => {
      URL.revokeObjectURL(blobUrl);
    });
  }, [adapter, events]);

  const conflictingIds = useMemo<ReadonlySet<string>>(() => {
    const pairs = detectConflicts([...events]);
    const ids = new Set<string>();
    for (const pair of pairs) {
      ids.add(pair.eventIdA);
      ids.add(pair.eventIdB);
    }
    return ids;
  }, [events]);

  const conflictTitlesMap = useMemo<ReadonlyMap<string, readonly string[]>>(() => {
    const pairs = detectConflicts([...events]);
    const map = new Map<string, string[]>();
    const eventById = new Map(events.map((e) => [e.id, e]));

    for (const pair of pairs) {
      const titleA = eventById.get(pair.eventIdA)?.title ?? '';
      const titleB = eventById.get(pair.eventIdB)?.title ?? '';

      if (!map.has(pair.eventIdA)) map.set(pair.eventIdA, []);
      const listA = map.get(pair.eventIdA);
      if (listA) listA.push(titleB);

      if (!map.has(pair.eventIdB)) map.set(pair.eventIdB, []);
      const listB = map.get(pair.eventIdB);
      if (listB) listB.push(titleA);
    }

    return map;
  }, [events]);

  return {
    events,
    sortOrder,
    changeSortOrder,
    unstarEvent,
    undoUnstar,
    confirmUnstar,
    pendingDeletions,
    exportEvents,
    loading,
    conflictingIds,
    conflictTitlesMap,
  };
}
