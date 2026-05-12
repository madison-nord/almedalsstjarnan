/**
 * EventList component for the Popup UI.
 *
 * Renders a list of starred events with pagination (load-more pattern).
 * Displays a count indicator showing "{displayed} av {total}" (sv) or "{displayed} of {total}" (en).
 * When total > displayed, shows a "Load more" button that loads the next 20 events.
 * Passes conflict information, onUnstar callback, and adapter to each EventItem.
 *
 * Requirements: 9.3, 1.2, 1.3, 1.8, 1.9, 1.10, 8.2
 */

import { useState } from 'react';

import type { IBrowserApiAdapter, StarredEvent } from '#core/types';

import { EventItem } from './EventItem';

const PAGE_SIZE = 20;

export interface EventListProps {
  readonly events: readonly StarredEvent[];
  readonly onUnstar: (eventId: string) => void;
  readonly adapter: IBrowserApiAdapter;
  readonly conflictingIds?: ReadonlySet<string>;
  readonly conflictTitlesMap?: ReadonlyMap<string, readonly string[]>;
}

export function EventList({ events, onUnstar, adapter, conflictingIds, conflictTitlesMap }: EventListProps): React.JSX.Element {
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);

  const total = events.length;
  const displayed = Math.min(displayCount, total);
  const displayedEvents = events.slice(0, displayed);
  const hasMore = total > displayed;

  const handleLoadMore = (): void => {
    setDisplayCount((prev) => prev + PAGE_SIZE);
  };

  const countText = total > 0
    ? adapter
        .getMessage('eventCountIndicator')
        .replace('{count}', String(displayed))
        .replace('{total}', String(total))
    : null;

  return (
    <div className="flex flex-col overflow-hidden">
      {countText !== null && (
        <div className="px-4 py-1 text-xs text-gray-500" aria-live="polite">
          {countText}
        </div>
      )}
      <ul className="overflow-y-auto max-h-[380px]" role="list">
        {displayedEvents.map((event) => (
          <EventItem
            key={event.id}
            event={event}
            onUnstar={onUnstar}
            adapter={adapter}
            isConflicting={conflictingIds?.has(event.id)}
            conflictTitles={conflictTitlesMap?.get(event.id)}
          />
        ))}
      </ul>
      {hasMore && (
        <div className="px-4 py-2 border-t border-gray-100">
          <button
            type="button"
            onClick={handleLoadMore}
            className="w-full py-1.5 px-3 text-sm font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors"
          >
            {adapter.getMessage('loadMore')}
          </button>
        </div>
      )}
    </div>
  );
}
