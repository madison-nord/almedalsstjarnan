/**
 * Locale-aware message retrieval module.
 *
 * Bundles both locale files (sv and en) and provides a `getLocalizedMessage`
 * function that retrieves messages for a specific locale. This enables the
 * language toggle to override the browser's default locale at runtime.
 *
 * Since `chrome.i18n.getMessage` always uses the browser locale and cannot
 * be overridden, this module provides an alternative path when a manual
 * language preference is set.
 *
 * Requirements: 6.5, 6.6, 6.7
 */

import svMessages from '../../_locales/sv/messages.json';
import enMessages from '../../_locales/en/messages.json';

export type SupportedLocale = 'sv' | 'en';

interface LocaleMessage {
  readonly message: string;
  readonly description?: string;
  readonly placeholders?: Record<string, { readonly content: string; readonly example?: string }>;
}

type LocaleMessages = Record<string, LocaleMessage>;

const LOCALE_DATA: Record<SupportedLocale, LocaleMessages> = {
  sv: svMessages as unknown as LocaleMessages,
  en: enMessages as unknown as LocaleMessages,
};

/**
 * Retrieves a localized message for the given key and locale.
 *
 * Supports placeholder substitution using $1, $2, etc. in the message string.
 * Pass substitution values as the third argument.
 *
 * @param key - The message key (e.g., 'popupTitle')
 * @param locale - The target locale ('sv' or 'en')
 * @param substitutions - Optional array of substitution values for placeholders
 * @returns The localized message string, or empty string if key not found
 */
export function getLocalizedMessage(
  key: string,
  locale: SupportedLocale,
  substitutions?: readonly string[],
): string {
  const messages = LOCALE_DATA[locale];
  const entry = messages[key];

  if (!entry) {
    return '';
  }

  let result = entry.message;

  if (substitutions && substitutions.length > 0) {
    for (let i = 0; i < substitutions.length; i++) {
      result = result.replace(`$${i + 1}`, substitutions[i] ?? '');
    }
  }

  return result;
}
