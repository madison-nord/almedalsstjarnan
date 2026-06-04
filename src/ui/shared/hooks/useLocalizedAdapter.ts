/**
 * Shared hook for creating a locale-aware adapter.
 *
 * When locale is set, overrides getMessage to use getLocalizedMessage.
 * When locale is null, returns the original adapter unchanged.
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
      ...adapter,
      getMessage: (key: string): string =>
        getLocalizedMessage(key, locale) || adapter.getMessage(key),
    };
  }, [adapter, locale]);
}
