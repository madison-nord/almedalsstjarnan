/**
 * Shared LanguageToggle component.
 *
 * Renders a native HTML <select> element with three options:
 * - Auto (browser) — follows the browser's language setting
 * - Svenska — forces Swedish locale
 * - English — forces English locale
 *
 * On mount, fetches the current language preference from storage via
 * GET_LANGUAGE_PREFERENCE message. On change, persists the selection
 * via SET_LANGUAGE_PREFERENCE and notifies the parent via onLocaleChange.
 * Shows a visible label and a hint to reload the popup after changing.
 *
 * Requirements: 6.5, 6.6, 6.7
 */

import { useState, useEffect, useCallback } from 'react';

import type { IBrowserApiAdapter } from '#core/types';

export interface LanguageToggleProps {
  readonly adapter: IBrowserApiAdapter;
  readonly onLocaleChange: (locale: 'sv' | 'en' | null) => void;
}

export function LanguageToggle({
  adapter,
  onLocaleChange,
}: LanguageToggleProps): React.JSX.Element {
  const [locale, setLocale] = useState<'sv' | 'en' | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [changed, setChanged] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchPreference(): Promise<void> {
      const response = await adapter.sendMessage<'sv' | 'en' | null>({
        command: 'GET_LANGUAGE_PREFERENCE',
      });

      if (cancelled) return;

      if (response.success) {
        setLocale(response.data);
      }
      setLoaded(true);
    }

    void fetchPreference();

    return () => {
      cancelled = true;
    };
  }, [adapter]);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>): void => {
      const value = event.target.value;
      const newLocale: 'sv' | 'en' | null =
        value === 'sv' ? 'sv' : value === 'en' ? 'en' : null;

      setLocale(newLocale);
      setChanged(true);
      onLocaleChange(newLocale);

      void adapter.sendMessage({
        command: 'SET_LANGUAGE_PREFERENCE',
        locale: newLocale,
      });
    },
    [adapter, onLocaleChange],
  );

  if (!loaded) {
    return <span className="text-sm text-gray-400">…</span>;
  }

  return (
    <div className="flex items-center gap-1.5">
      <label htmlFor="language-toggle" className="text-xs text-gray-600 font-medium">
        {adapter.getMessage('languageVisibleLabel')}
      </label>
      <select
        id="language-toggle"
        value={locale ?? 'auto'}
        onChange={handleChange}
        aria-label={adapter.getMessage('languageLabel')}
        className="text-sm border border-gray-300 rounded px-2 py-1 bg-white text-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        <option value="auto">{adapter.getMessage('languageAuto')}</option>
        <option value="sv">{adapter.getMessage('languageSv')}</option>
        <option value="en">{adapter.getMessage('languageEn')}</option>
      </select>
      {changed && (
        <span className="text-xs text-gray-400 italic">
          {adapter.getMessage('reloadPopupHint')}
        </span>
      )}
    </div>
  );
}
