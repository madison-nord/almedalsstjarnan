/**
 * Main Popup App component.
 *
 * On mount:
 * - Sends GET_ALL_STARRED_EVENTS and GET_SORT_ORDER via adapter
 * - Sends GET_ONBOARDING_STATE to check if onboarding was dismissed
 * - Displays up to 20 events sorted by current order using Sorter
 * - Renders SortSelector
 * - Handles sort order change (sends SET_SORT_ORDER, re-sorts)
 * - Renders "Open full list" button (opens stars.html via createTab)
 * - Renders empty state when no events
 * - Renders UndoToast for each pending deletion
 * - Renders OnboardingView on first run (before dismissal)
 * - Renders "How it works" help link in footer
 * - Registers adapter.onStorageChanged for live updates, cleans up on unmount
 * - All strings via i18n
 *
 * Requirements: 9.1–9.9, 7.1, 7.2, 7.3, 6.1, 6.2, 6.3, 6.4
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

import type { IBrowserApiAdapter } from '#core/types';
import { getLocalizedMessage } from '#core/locale-messages';

import { SortSelector } from '#ui/shared/SortSelector';
import { UndoToast } from '#ui/shared/UndoToast';
import { LanguageToggle } from '#ui/shared/LanguageToggle';

import { EventList } from './components/EventList';
import { EmptyState } from './components/EmptyState';
import { ExportButton } from './components/ExportButton';
import { OnboardingView } from './components/OnboardingView';
import { useStarredEvents } from './hooks/useStarredEvents';

export interface AppProps {
  readonly adapter: IBrowserApiAdapter;
}

export function App({ adapter }: AppProps): React.JSX.Element {
  const {
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
  } = useStarredEvents(adapter);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingLoaded, setOnboardingLoaded] = useState(false);
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

  useEffect(() => {
    let cancelled = false;

    async function fetchOnboardingState(): Promise<void> {
      const response = await adapter.sendMessage<boolean>({
        command: 'GET_ONBOARDING_STATE',
      });

      if (cancelled) return;

      if (response.success) {
        // response.data is true when dismissed, so show when NOT dismissed
        setShowOnboarding(!response.data);
      } else {
        // Default to showing onboarding if we can't read state
        setShowOnboarding(true);
      }
      setOnboardingLoaded(true);
    }

    void fetchOnboardingState();

    return () => {
      cancelled = true;
    };
  }, [adapter]);

  const handleDismissOnboarding = useCallback((): void => {
    setShowOnboarding(false);
    void adapter.sendMessage({
      command: 'SET_ONBOARDING_STATE',
      dismissed: true,
    });
  }, [adapter]);

  const handleShowOnboarding = useCallback((): void => {
    setShowOnboarding(true);
  }, []);

  const handleLocaleChange = useCallback((newLocale: 'sv' | 'en' | null): void => {
    setLocale(newLocale);
  }, []);

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

  const handleOpenFullList = (): void => {
    void adapter.createTab({ url: 'src/ui/stars/stars.html' });
  };

  if (loading || !onboardingLoaded) {
    return (
      <div className="w-[360px] h-[560px] min-h-[560px] flex items-center justify-center">
        <span className="text-sm text-gray-400">…</span>
      </div>
    );
  }

  return (
    <div key={locale ?? 'auto'} className="w-[360px] h-[560px] min-h-[560px] flex flex-col overflow-hidden bg-white">
      <header className="flex-shrink-0 bg-brand-secondary px-4 pt-4 pb-2 border-b-[3px] border-brand-primary">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-brand-accent text-lg" aria-hidden="true">★</span>
          <h1 className="text-lg font-semibold text-white">
            {localizedAdapter.getMessage('popupTitle')}
            {events.length > 0 && (
              <span className="ml-1 font-normal text-sm text-gray-300">({events.length})</span>
            )}
          </h1>
        </div>
        <SortSelector
          currentOrder={sortOrder}
          onOrderChange={changeSortOrder}
          adapter={localizedAdapter}
          labelClassName="text-gray-200"
        />
      </header>

      {showOnboarding && (
        <OnboardingView adapter={localizedAdapter} onDismiss={handleDismissOnboarding} />
      )}

      <div className="flex-1 overflow-hidden">
        {events.length === 0 ? (
          <EmptyState adapter={localizedAdapter} />
        ) : (
          <EventList events={events} onUnstar={unstarEvent} adapter={localizedAdapter} conflictingIds={conflictingIds} conflictTitlesMap={conflictTitlesMap} />
        )}
      </div>

      <footer className="flex-shrink-0 px-4 py-3 border-t border-gray-200 flex flex-col gap-2">
        <ExportButton
          onExport={exportEvents}
          adapter={localizedAdapter}
          disabled={events.length === 0}
        />
        <a
          href="https://almedalsveckan.info/rg/almedalsveckan/officiellt-program/program-2026"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-2 px-4 text-sm font-medium text-center text-brand-primary bg-brand-surface rounded hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors"
        >
          {localizedAdapter.getMessage('goToProgramme')}
        </a>
        <button
          type="button"
          onClick={handleOpenFullList}
          className="w-full py-2 px-4 text-sm font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors"
        >
          {localizedAdapter.getMessage('openFullList')}
        </button>
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleShowOnboarding}
            className="py-1 text-xs text-gray-500 hover:text-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors"
          >
            {localizedAdapter.getMessage('helpLink')}
          </button>
          <LanguageToggle adapter={localizedAdapter} onLocaleChange={handleLocaleChange} />
        </div>
      </footer>

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
    </div>
  );
}
