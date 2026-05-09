/**
 * Custom hook encapsulating starred events fetch, sort, unstar, export,
 * undo, and live update logic for the Stars Page.
 *
 * - Fetches starred events via GET_ALL_STARRED_EVENTS on mount
 * - Fetches sort order via GET_SORT_ORDER on mount
 * - Sorts events using sortEvents from #core/sorter
 * - Provides changeSortOrder that sends SET_SORT_ORDER and re-sorts
 * - Provides unstarEvent with deferred deletion (undo support)
 * - Provides undoUnstar to restore a pending-deletion event
 * - Provides confirmUnstar to permanently remove a pending-deletion event
 * - Provides exportEvents that generates ICS and triggers download
 * - Registers adapter.onStorageChanged for live updates
 * - Cleans up the storage listener on unmount
 * - No 20-item cap (shows all events)
 *
 * Requirements: 10.2, 10.3, 10.5, 10.7, 10.8, 10.9, 7.1, 7.2, 7.3
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
import { filterEvents } from '#core/event-filter';

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
  readonly filterText: string;
  readonly setFilterText: (text: string) => void;
  readonly filteredEvents: readonly StarredEvent[];
  readonly selectedIds: ReadonlySet<string>;
  readonly toggleSelection: (eventId: string) => void;
  readonly selectAll: () => void;
  readonly clearSelection: () => void;
  readonly unstarSelected: () => void;
  readonly exportSelected: () => void;
}

export function useStarredEvents(
  adapter: IBrowserApiAdapter,
): UseStarredEventsResult {
  const [events, setEvents] = useState<readonly StarredEvent[]>([]);
  const [sortOrder, setSortOrder] = useState<SortOrder>(DEFAULT_SORT_ORDER);
  const [loading, setLoading] = useState(true);
  const [pendingDeletions, setPendingDeletions] = useState<StarredEvent[]>([]);
  const [filterText, setFilterText] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const sortOrderRef = useRef<SortOrder>(DEFAULT_SORT_ORDER);
  const pendingDeletionsRef = useRef<Set<string>>(new Set());
  const fetchGenerationRef = useRef(0);

  const fetchEvents = useCallback(
    async (order: SortOrder): Promise<void> => {
      const generation = ++fetchGenerationRef.current;

      const response =
        await adapter.sendMessage<StarredEvent[]>({
          command: 'GET_ALL_STARRED_EVENTS',
        }) as GetAllStarredEventsResponse;

      // Discard stale responses — only the latest fetch should set state
      if (generation !== fetchGenerationRef.current) return;

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
      // Find the event before removing it, keep in pendingDeletions for undo
      setEvents((prev) => {
        const event = prev.find((e) => e.id === eventId);
        if (event) {
          setPendingDeletions((pd) => [...pd, event]);
        }
        return prev.filter((e) => e.id !== eventId);
      });
      // Send UNSTAR_EVENT immediately for instant cross-view sync
      void adapter.sendMessage({ command: 'UNSTAR_EVENT', eventId });
    },
    [adapter],
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
          // Re-star in storage (reverses the immediate UNSTAR_EVENT)
          void adapter.sendMessage({ command: 'STAR_EVENT', event });
        }
        return prev.filter((e) => e.id !== eventId);
      });
    },
    [adapter],
  );

  const confirmUnstar = useCallback(
    (eventId: string): void => {
      // Event was already removed from storage in unstarEvent.
      // Keep ID in pendingDeletionsRef — fetchEvents will clean it up
      // once it confirms the event is gone from storage.
      setPendingDeletions((prev) => prev.filter((e) => e.id !== eventId));
    },
    [],
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

  const filteredEvents = useMemo<readonly StarredEvent[]>(
    () => filterEvents(events, filterText),
    [events, filterText],
  );

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

  const toggleSelection = useCallback(
    (eventId: string): void => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(eventId)) {
          next.delete(eventId);
        } else {
          next.add(eventId);
        }
        return next;
      });
    },
    [],
  );

  const selectAll = useCallback((): void => {
    setSelectedIds(new Set(filteredEvents.map((e) => e.id)));
  }, [filteredEvents]);

  const clearSelection = useCallback((): void => {
    setSelectedIds(new Set());
  }, []);

  const unstarSelected = useCallback((): void => {
    // Bulk action: remove from local state AND send UNSTAR_EVENT immediately
    // (no undo toast for explicit bulk actions — too slow for UX)
    const idsToRemove = new Set(selectedIds);
    setEvents((prev) => prev.filter((e) => !idsToRemove.has(e.id)));
    for (const eventId of idsToRemove) {
      void adapter.sendMessage({ command: 'UNSTAR_EVENT', eventId });
    }
    setSelectedIds(new Set());
  }, [selectedIds, adapter]);

  const exportSelected = useCallback((): void => {
    const selectedEvents = events.filter((e) => selectedIds.has(e.id));
    if (selectedEvents.length === 0) return;

    const icsContent = generateICS([...selectedEvents], 'sv');
    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const blobUrl = URL.createObjectURL(blob);
    const filename = generateExportFilename();

    void adapter.download({ url: blobUrl, filename }).then(() => {
      URL.revokeObjectURL(blobUrl);
    });
  }, [adapter, events, selectedIds]);

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
    filterText,
    setFilterText,
    filteredEvents,
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    unstarSelected,
    exportSelected,
  };
}
