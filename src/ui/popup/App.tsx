/**
 * Main Popup App component.
 *
 * On mount:
 * - Sends GET_ALL_STARRED_EVENTS and GET_SORT_ORDER via adapter
 * - Displays up to 20 events sorted by current order using Sorter
 * - Renders SortSelector
 * - Handles sort order change (sends SET_SORT_ORDER, re-sorts)
 * - Renders "Open full list" button (opens stars.html via createTab)
 * - Renders empty state when no events
 * - Registers adapter.onStorageChanged for live updates, cleans up on unmount
 * - All strings via i18n
 *
 * Requirements: 9.1–9.9
 */

import type { IBrowserApiAdapter } from '#core/types';

import { SortSelector } from '#ui/shared/SortSelector';

import { EventList } from './components/EventList';
import { EmptyState } from './components/EmptyState';
import { useStarredEvents } from './hooks/useStarredEvents';

export interface AppProps {
  readonly adapter: IBrowserApiAdapter;
}

export function App({ adapter }: AppProps): React.JSX.Element {
  const { events, sortOrder, changeSortOrder, loading } =
    useStarredEvents(adapter);

  const handleOpenFullList = (): void => {
    void adapter.createTab({ url: 'stars.html' });
  };

  if (loading) {
    return (
      <div className="w-[360px] min-h-[480px] flex items-center justify-center">
        <span className="text-sm text-gray-400">…</span>
      </div>
    );
  }

  return (
    <div className="w-[360px] min-h-[480px] flex flex-col bg-white">
      <header className="px-4 pt-4 pb-2">
        <h1 className="text-lg font-semibold text-gray-900 mb-2">
          {adapter.getMessage('popupTitle')}
        </h1>
        <SortSelector
          currentOrder={sortOrder}
          onOrderChange={changeSortOrder}
          adapter={adapter}
        />
      </header>

      {events.length === 0 ? (
        <EmptyState adapter={adapter} />
      ) : (
        <EventList events={events} />
      )}

      <footer className="px-4 py-3 border-t border-gray-200">
        <button
          type="button"
          onClick={handleOpenFullList}
          className="w-full py-2 px-4 text-sm font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors"
        >
          {adapter.getMessage('openFullList')}
        </button>
      </footer>
    </div>
  );
}
