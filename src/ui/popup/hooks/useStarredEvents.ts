/**
 * Custom hook encapsulating starred events fetch, sort, and live update logic
 * for the Popup UI.
 *
 * - Fetches starred events via GET_ALL_STARRED_EVENTS on mount
 * - Fetches sort order via GET_SORT_ORDER on mount
 * - Sorts events using sortEvents from #core/sorter
 * - Provides changeSortOrder that sends SET_SORT_ORDER and re-sorts
 * - Registers adapter.onStorageChanged for live updates
 * - Cleans up the storage listener on unmount
 *
 * Requirements: 9.2, 9.3, 9.5, 9.6
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

export interface UseStarredEventsResult {
  readonly events: readonly StarredEvent[];
  readonly sortOrder: SortOrder;
  readonly changeSortOrder: (order: SortOrder) => void;
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

  return { events, sortOrder, changeSortOrder, loading };
}
