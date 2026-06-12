/**
 * Custom hook encapsulating starred events fetch, sort, unstar, export,
 * undo, and live update logic for the Stars Page.
 *
 * - Fetches starred events via GET_ALL_STARRED_EVENTS on mount
 * - Initializes sort order to DEFAULT_SORT_ORDER (local in-memory state only)
 * - Sorts events using sortEvents from #core/sorter
 * - Provides changeSortOrder that re-sorts locally (no persistence)
 * - Provides unstarEvent with deferred deletion (undo support)
 * - Provides undoUnstar to restore a pending-deletion event
 * - Provides confirmUnstar to permanently remove a pending-deletion event
 * - Provides exportEvents that generates ICS and triggers download
 * - Registers adapter.onStorageChanged for live updates
 * - Cleans up the storage listener on unmount
 * - No 20-item cap (shows all events)
 *
 * Requirements: 10.2, 10.3, 10.5, 10.7, 10.8, 10.9, 7.1, 7.2, 7.3, 1.1, 1.5
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

import type {
  IBrowserApiAdapter,
  StarredEvent,
  SortOrder,
  GetAllStarredEventsResponse,
} from '#core/types';
import { DEFAULT_SORT_ORDER } from '#core/types';
import { sortEvents } from '#core/sorter';
import { generateICS, generateExportFilename } from '#core/ics-generator';
import { detectConflicts } from '#core/conflict-detector';
import { filterEvents } from '#core/event-filter';
import type { SupportedLocale } from '#core/locale-messages';
import { resolveEffectiveLocale } from '#core/locale-messages';

export interface UseStarredEventsOptions {
  readonly onLanguageChange?: (locale: 'sv' | 'en' | null) => void;
}

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
  languagePreference: SupportedLocale | null,
  options?: UseStarredEventsOptions,
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

      const response = (await adapter.sendMessage<StarredEvent[]>({
        command: 'GET_ALL_STARRED_EVENTS',
      })) as GetAllStarredEventsResponse;

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
          const filtered =
            pendingIds.size > 0
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
      const eventsResponse = (await adapter.sendMessage<StarredEvent[]>({
        command: 'GET_ALL_STARRED_EVENTS',
      })) as GetAllStarredEventsResponse;

      if (cancelled) return;

      if (eventsResponse.success) {
        const sorted = sortEvents(eventsResponse.data, DEFAULT_SORT_ORDER);
        setEvents(sorted);
      }

      setLoading(false);
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, [adapter]);

  const onLanguageChange = options?.onLanguageChange;

  useEffect(() => {
    const unsubscribe = adapter.onStorageChanged((changes) => {
      if ('starredEvents' in changes) {
        void fetchEvents(sortOrderRef.current);
      }
      if ('languagePreference' in changes) {
        const newValue =
          (changes.languagePreference?.newValue as 'sv' | 'en' | null | undefined) ?? null;
        onLanguageChange?.(newValue);
      }
    });

    return unsubscribe;
  }, [adapter, fetchEvents, onLanguageChange]);

  const changeSortOrder = useCallback((order: SortOrder): void => {
    setSortOrder(order);
    sortOrderRef.current = order;

    setEvents((prev) => sortEvents([...prev], order));
  }, []);

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
          setEvents((currentEvents) => sortEvents([...currentEvents, event], sortOrderRef.current));
          // Re-star in storage (reverses the immediate UNSTAR_EVENT)
          void adapter.sendMessage({ command: 'STAR_EVENT', event });
        }
        return prev.filter((e) => e.id !== eventId);
      });
    },
    [adapter],
  );

  const confirmUnstar = useCallback((eventId: string): void => {
    // Event was already removed from storage in unstarEvent.
    // Keep ID in pendingDeletionsRef — fetchEvents will clean it up
    // once it confirms the event is gone from storage.
    setPendingDeletions((prev) => prev.filter((e) => e.id !== eventId));
  }, []);

  const exportEvents = useCallback((): void => {
    const effectiveLocale = resolveEffectiveLocale(languagePreference);
    const icsContent = generateICS([...events], effectiveLocale);
    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const blobUrl = URL.createObjectURL(blob);
    const filename = generateExportFilename();

    void adapter.download({ url: blobUrl, filename }).then(() => {
      URL.revokeObjectURL(blobUrl);
    });
  }, [adapter, events, languagePreference]);

  const filteredEvents = useMemo<readonly StarredEvent[]>(
    () => filterEvents(events, filterText),
    [events, filterText],
  );

  const { conflictingIds, conflictTitlesMap } = useMemo(() => {
    const pairs = detectConflicts([...events]);

    const ids = new Set<string>();
    for (const pair of pairs) {
      ids.add(pair.eventIdA);
      ids.add(pair.eventIdB);
    }

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

    return {
      conflictingIds: ids as ReadonlySet<string>,
      conflictTitlesMap: map as ReadonlyMap<string, readonly string[]>,
    };
  }, [events]);

  const toggleSelection = useCallback((eventId: string): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((): void => {
    setSelectedIds(new Set(filteredEvents.map((e) => e.id)));
  }, [filteredEvents]);

  const clearSelection = useCallback((): void => {
    setSelectedIds(new Set());
  }, []);

  const unstarSelected = useCallback((): void => {
    // If more than 5 events selected, require confirmation before removal
    if (selectedIds.size > 5) {
      try {
        const confirmed = window.confirm(adapter.getMessage('bulkUnstarConfirm'));
        if (!confirmed) return;
      } catch {
        // If window.confirm throws, default to not removing events
        return;
      }
    }

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

    const effectiveLocale = resolveEffectiveLocale(languagePreference);
    const icsContent = generateICS([...selectedEvents], effectiveLocale);
    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const blobUrl = URL.createObjectURL(blob);
    const filename = generateExportFilename();

    void adapter.download({ url: blobUrl, filename }).then(() => {
      URL.revokeObjectURL(blobUrl);
    });
  }, [adapter, events, selectedIds, languagePreference]);

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
