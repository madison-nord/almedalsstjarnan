/**
 * Main Stars Page App component.
 *
 * On mount:
 * - Sends GET_ALL_STARRED_EVENTS and GET_SORT_ORDER via adapter
 * - Displays all events in 6-column grid sorted by current order
 * - Renders SortSelector
 * - Handles sort order change (sends SET_SORT_ORDER, re-sorts)
 * - Renders export button (generates ICS, triggers download)
 * - Renders unstar action per row (sends UNSTAR_EVENT, removes from list)
 * - Renders empty state when no events
 * - Registers adapter.onStorageChanged for live updates, cleans up on unmount
 * - All strings via i18n
 *
 * Requirements: 10.1–10.10
 */

import type { IBrowserApiAdapter } from '#core/types';

import { SortSelector } from '#ui/shared/SortSelector';

import { EventGrid } from './components/EventGrid';
import { ExportButton } from './components/ExportButton';
import { EmptyState } from './components/EmptyState';
import { useStarredEvents } from './hooks/useStarredEvents';

export interface AppProps {
  readonly adapter: IBrowserApiAdapter;
}

export function App({ adapter }: AppProps): React.JSX.Element {
  const { events, sortOrder, changeSortOrder, unstarEvent, exportEvents, loading } =
    useStarredEvents(adapter);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <span className="text-sm text-gray-400">…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="px-6 pt-6 pb-4">
        <h1 className="text-xl font-semibold text-gray-900 mb-4">
          {adapter.getMessage('starsPageTitle')}
        </h1>
        <div className="flex items-center gap-4">
          <SortSelector
            currentOrder={sortOrder}
            onOrderChange={changeSortOrder}
            adapter={adapter}
          />
          <ExportButton onExport={exportEvents} adapter={adapter} />
        </div>
      </header>

      <main className="flex-1 px-6 pb-6">
        {events.length === 0 ? (
          <EmptyState adapter={adapter} />
        ) : (
          <EventGrid
            events={events}
            onUnstar={unstarEvent}
            adapter={adapter}
          />
        )}
      </main>
    </div>
  );
}
