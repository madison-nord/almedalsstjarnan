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

import { useState, useEffect, useMemo } from 'react';

import type { IBrowserApiAdapter } from '#core/types';
import { getLocalizedMessage } from '#core/locale-messages';

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

  const [locale, setLocale] = useState<'sv' | 'en' | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchLanguagePreference(): Promise<void> {
      const response = await adapter.sendMessage<'sv' | 'en' | null>({
        command: 'GET_LANGUAGE_PREFERENCE',
      });

      if (cancelled) return;

      if (response.success) {
        setLocale(response.data);
      }
    }

    void fetchLanguagePreference();

    return () => {
      cancelled = true;
    };
  }, [adapter]);

  const localizedAdapter: IBrowserApiAdapter = useMemo(() => {
    if (!locale) return adapter;
    return {
      storageLocalGet: adapter.storageLocalGet.bind(adapter),
      storageLocalSet: adapter.storageLocalSet.bind(adapter),
      sendMessage: adapter.sendMessage.bind(adapter),
      download: adapter.download.bind(adapter),
      createTab: adapter.createTab.bind(adapter),
      onStorageChanged: adapter.onStorageChanged.bind(adapter),
      getMessage: (key: string): string =>
        getLocalizedMessage(key, locale) || adapter.getMessage(key),
    };
  }, [adapter, locale]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <span className="text-sm text-gray-400">…</span>
      </div>
    );
  }

  return (
    <div key={locale ?? 'auto'} className="min-h-screen flex flex-col bg-brand-surface">
      <header className="bg-brand-secondary px-4 sm:px-6 lg:px-8 pt-4 pb-3 border-b-[3px] border-brand-primary">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-brand-accent text-lg" aria-hidden="true">★</span>
          <h1 className="text-lg font-bold text-white">
            {localizedAdapter.getMessage('extensionName')}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <SortSelector
            currentOrder={sortOrder}
            onOrderChange={changeSortOrder}
            adapter={localizedAdapter}
            labelClassName="text-gray-200"
          />
          <SearchFilter
            value={filterText}
            onChange={setFilterText}
            adapter={localizedAdapter}
          />
          <ExportButton onExport={exportEvents} adapter={localizedAdapter} />
        </div>
      </header>

      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 pb-6">
        {filteredEvents.length === 0 ? (
          <EmptyState adapter={localizedAdapter} />
        ) : (
          <EventGrid
            events={filteredEvents}
            onUnstar={unstarEvent}
            adapter={localizedAdapter}
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
              adapter={localizedAdapter}
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
        adapter={localizedAdapter}
      />
    </div>
  );
}
