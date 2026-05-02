/**
 * Custom hook encapsulating starred events fetch, sort, unstar, export,
 * and live update logic for the Stars Page.
 *
 * - Fetches starred events via GET_ALL_STARRED_EVENTS on mount
 * - Fetches sort order via GET_SORT_ORDER on mount
 * - Sorts events using sortEvents from #core/sorter
 * - Provides changeSortOrder that sends SET_SORT_ORDER and re-sorts
 * - Provides unstarEvent that sends UNSTAR_EVENT and removes from local state
 * - Provides exportEvents that generates ICS and triggers download
 * - Registers adapter.onStorageChanged for live updates
 * - Cleans up the storage listener on unmount
 * - No 20-item cap (shows all events)
 *
 * Requirements: 10.2, 10.3, 10.5, 10.7, 10.8, 10.9
 */

import { useState, useEffect, useCallback, useRef } from 'react';

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

export interface UseStarredEventsResult {
  readonly events: readonly StarredEvent[];
  readonly sortOrder: SortOrder;
  readonly changeSortOrder: (order: SortOrder) => void;
  readonly unstarEvent: (eventId: string) => void;
  readonly exportEvents: () => void;
  readonly loading: boolean;
}

export function useStarredEvents(
  adapter: IBrowserApiAdapter,
): UseStarredEventsResult {
  const [events, setEvents] = useState<readonly StarredEvent[]>([]);
  const [sortOrder, setSortOrder] = useState<SortOrder>(DEFAULT_SORT_ORDER);
  const [loading, setLoading] = useState(true);
  const sortOrderRef = useRef<SortOrder>(DEFAULT_SORT_ORDER);

  const fetchEvents = useCallback(
    async (order: SortOrder): Promise<void> => {
      const response =
        await adapter.sendMessage<StarredEvent[]>({
          command: 'GET_ALL_STARRED_EVENTS',
        }) as GetAllStarredEventsResponse;

      if (response.success) {
        const sorted = sortEvents(response.data, order);
        setEvents(sorted);
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
      void adapter.sendMessage({ command: 'UNSTAR_EVENT', eventId });

      // Optimistic update: remove from local state
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
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

  return { events, sortOrder, changeSortOrder, unstarEvent, exportEvents, loading };
}
