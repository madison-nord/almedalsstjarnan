// Feature: user-help-onboarding, Property 1: i18n Completeness

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import enMessages from '../../_locales/en/messages.json';
import svMessages from '../../_locales/sv/messages.json';

/**
 * Property 1: i18n Completeness
 *
 * For any Help_Modal message key (modal title, dismiss label, and all 9
 * feature group heading/description keys) and for any supported locale
 * (sv, en), the locale message catalog SHALL contain an entry with a
 * non-empty `message` field and a non-empty `description` field.
 *
 * Validates: Requirements 7.1, 7.2, 7.3
 */
describe('Property 1: i18n Completeness', () => {
  const HELP_MODAL_KEYS = [
    'helpModalTitle',
    'helpModalDismiss',
    'helpGroupStarEventsHeading',
    'helpGroupStarEventsDesc',
    'helpGroupPopupViewHeading',
    'helpGroupPopupViewDesc',
    'helpGroupStarsPageHeading',
    'helpGroupStarsPageDesc',
    'helpGroupSortingHeading',
    'helpGroupSortingDesc',
    'helpGroupConflictHeading',
    'helpGroupConflictDesc',
    'helpGroupSearchFilterHeading',
    'helpGroupSearchFilterDesc',
    'helpGroupBulkActionsHeading',
    'helpGroupBulkActionsDesc',
    'helpGroupIcsExportHeading',
    'helpGroupIcsExportDesc',
    'helpGroupLanguageHeading',
    'helpGroupLanguageDesc',
  ] as const;

  const catalogs: Record<string, Record<string, { readonly message: string; readonly description: string }>> = {
    en: enMessages as Record<string, { readonly message: string; readonly description: string }>,
    sv: svMessages as Record<string, { readonly message: string; readonly description: string }>,
  };

  it('every Help_Modal key has non-empty message and description in every locale', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...HELP_MODAL_KEYS),
        fc.constantFrom('sv', 'en'),
        (key, locale) => {
          const catalog = catalogs[locale]!;
          const entry = catalog[key];

          expect(entry).toBeDefined();
          if (!entry) return;
          expect(entry.message).toBeDefined();
          expect(entry.message.length).toBeGreaterThan(0);
          expect(entry.description).toBeDefined();
          expect(entry.description.length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
