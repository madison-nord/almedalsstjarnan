/**
 * Main Stars Page App component.
 *
 * On mount:
 * - Sends GET_ALL_STARRED_EVENTS and GET_SORT_ORDER via adapter
 * - Displays all events in 6-column grid sorted by current order
 * - Renders SortSelector
 * - Handles sort order change (sends SET_SORT_ORDER, re-sorts)
 * - Renders export button (generates ICS, triggers download)
 * - Renders unstar action per row (deferred deletion with undo)
 * - Renders UndoToast for each pending deletion
 * - Renders empty state when no events
 * - Registers adapter.onStorageChanged for live updates, cleans up on unmount
 * - All strings via i18n
 *
 * Requirements: 10.1–10.10, 7.1, 7.2, 7.3
 */

import type { IBrowserApiAdapter } from '#core/types';

import { SortSelector } from '#ui/shared/SortSelector';
import { UndoToast } from '#ui/shared/UndoToast';

import { EventGrid } from './components/EventGrid';
import { ExportButton } from './components/ExportButton';
import { EmptyState } from './components/EmptyState';
import { SearchFilter } from './components/SearchFilter';
import { BulkActions } from './components/BulkActions';
import { useStarredEvents } from './hooks/useStarredEvents';

export interface AppProps {
  readonly adapter: IBrowserApiAdapter;
}

export function App({ adapter }: AppProps): React.JSX.Element {
  const {
    events: _events,
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
  } = useStarredEvents(adapter);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <span className="text-sm text-gray-400">…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-brand-surface">
      <header className="w-full px-4 sm:px-6 lg:px-8 pt-6 pb-4">
        <h1 className="text-xl font-semibold text-gray-900 mb-4">
          {adapter.getMessage('starsPageTitle')}
        </h1>
        <div className="flex flex-wrap items-center gap-4">
          <SortSelector
            currentOrder={sortOrder}
            onOrderChange={changeSortOrder}
            adapter={adapter}
          />
          <SearchFilter
            value={filterText}
            onChange={setFilterText}
            adapter={adapter}
          />
          <ExportButton onExport={exportEvents} adapter={adapter} />
        </div>
      </header>

      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 pb-6">
        {filteredEvents.length === 0 ? (
          <EmptyState adapter={adapter} />
        ) : (
          <EventGrid
            events={filteredEvents}
            onUnstar={unstarEvent}
            adapter={adapter}
            conflictingIds={conflictingIds}
            conflictTitlesMap={conflictTitlesMap}
            selectedIds={selectedIds}
            onToggleSelection={toggleSelection}
            onSelectAll={selectedIds.size === filteredEvents.length ? clearSelection : selectAll}
            allSelected={filteredEvents.length > 0 && selectedIds.size === filteredEvents.length}
          />
        )}
      </main>

      {pendingDeletions.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 flex flex-col gap-2 z-50">
          {pendingDeletions.map((event) => (
            <UndoToast
              key={event.id}
              eventTitle={event.title}
              onUndo={() => undoUnstar(event.id)}
              onExpire={() => confirmUnstar(event.id)}
              adapter={adapter}
            />
          ))}
        </div>
      )}

      <BulkActions
        selectedCount={selectedIds.size}
        totalCount={filteredEvents.length}
        onSelectAll={selectAll}
        onClearSelection={clearSelection}
        onUnstarSelected={unstarSelected}
        onExportSelected={exportSelected}
        allSelected={filteredEvents.length > 0 && selectedIds.size === filteredEvents.length}
        adapter={adapter}
      />
    </div>
  );
}
