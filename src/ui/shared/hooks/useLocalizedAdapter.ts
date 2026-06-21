/**
 * Shared hook for creating a locale-aware adapter.
 *
 * When locale is set, overrides getMessage to use getLocalizedMessage.
 * When locale is null, returns the original adapter unchanged.
 *
 * Uses explicit method delegation instead of object spread to ensure
 * prototype methods from class-based adapters are preserved.
 *
 * Requirements: 10.1, 10.2
 */

import { useMemo } from 'react';

import type { IBrowserApiAdapter } from '#core/types';
import { getLocalizedMessage } from '#core/locale-messages';

export function useLocalizedAdapter(
  adapter: IBrowserApiAdapter,
  locale: 'sv' | 'en' | null,
): IBrowserApiAdapter {
  return useMemo(() => {
    if (!locale) return adapter;
    return {
      storageLocalGet: (keys) => adapter.storageLocalGet(keys),
      storageLocalSet: (items) => adapter.storageLocalSet(items),
      sendMessage: (message) => adapter.sendMessage(message),
      getMessage: (key: string): string =>
        getLocalizedMessage(key, locale) || adapter.getMessage(key),
      download: (options) => adapter.download(options),
      createTab: (options) => adapter.createTab(options),
      onStorageChanged: (callback) => adapter.onStorageChanged(callback),
    };
  }, [adapter, locale]);
}
