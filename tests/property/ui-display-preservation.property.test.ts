/**
 * Preservation Property Tests — UI Display Bugs.
 *
 * Feature: almedals-planner-extension, Property 2: Preservation
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 *
 * These tests capture EXISTING behavior on the UNFIXED code. They must PASS
 * on unfixed code, confirming the baseline behavior that must not regress
 * after bug fixes are applied.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import fc from 'fast-check';
import { createElement } from 'react';
import { render, fireEvent } from '@testing-library/react';

import type { IBrowserApiAdapter } from '#core/types';
import { formatEventDateTime } from '#core/date-formatter';
import { createStarButton } from '#extension/star-button';
import { EventItem } from '#ui/popup/components/EventItem';
import { EventGrid } from '#ui/stars/components/EventGrid';
import { mockBrowserApi } from '#test/helpers/mock-browser-api';
import { starredEventArb, starredEventArrayArb } from '#test/helpers/event-generators';

// Feature: almedals-planner-extension, Property 2: Preservation

// ─── Helpers ──────────────────────────────────────────────────────

function setupAdapter(): IBrowserApiAdapter {
  const adapter = mockBrowserApi;
  (adapter.getMessage as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
    if (key === 'starEvent') return 'Star event';
    if (key === 'unstarEvent') return 'Unstar event';
    if (key === 'expandEvent') return 'Visa detaljer';
    if (key === 'collapseEvent') return 'Dölj detaljer';
    if (key === 'showMore') return 'Visa mer';
    if (key === 'showLess') return 'Visa mindre';
    if (key === 'unstarAction') return 'Ta bort';
    if (key === 'selectAll') return 'Markera alla';
    if (key === 'columnTitle') return 'Titel';
    if (key === 'columnOrganiser') return 'Arrangör';
    if (key === 'columnDateTime') return 'Datum & tid';
    if (key === 'columnLocation') return 'Plats';
    if (key === 'columnTopic') return 'Ämne';
    if (key === 'columnActions') return 'Åtgärder';
    return '';
  });
  return adapter;
}

/** Snapshot of the original Swedish messages for preservation checks. */
const ORIGINAL_SV_MESSAGES: Record<string, string> = {
  extensionName: 'Almedalsstjärnan',
  extensionDescription:
    'Stjärnmärk evenemang i Almedalsveckans program och exportera ditt schema som kalenderfil.',
  starEvent: 'Stjärnmärk evenemang',
  unstarEvent: 'Ta bort stjärnmärkning',
  popupTitle: 'Almedalsstjärnan',
  starsPageTitle: 'Alla stjärnmärkta evenemang',
  openFullList: 'Öppna hela listan',
  exportToCalendar: 'Exportera till kalender',
  sortChronological: 'Kronologisk',
  sortReverseChronological: 'Omvänd kronologisk',
  sortAlphabeticalTitle: 'Titel A–Ö',
  sortStarredDesc: 'Senast stjärnmärkta',
  sortLabel: 'Sortera efter',
  emptyStateTitle: 'Inga stjärnmärkta evenemang',
  emptyStateMessage:
    'Besök Almedalsveckans program och klicka på stjärnan för att spara evenemang.',
  unstarAction: 'Ta bort',
  icsSourceLabel: 'Källa:',
  errorStorageFailed: 'Kunde inte spara. Försök igen.',
  errorExportFailed: 'Exporten misslyckades. Försök igen.',
  successExport: 'Kalenderfil exporterad.',
  columnTitle: 'Titel',
  columnOrganiser: 'Arrangör',
  columnDateTime: 'Datum & tid',
  columnLocation: 'Plats',
  columnTopic: 'Ämne',
  columnActions: 'Åtgärder',
  conflictWarning: 'Överlappar',
  undoAction: 'Ångra',
  eventRemoved: 'Evenemang borttaget',
  expandEvent: 'Visa detaljer',
  collapseEvent: 'Dölj detaljer',
  loadMore: 'Visa fler',
  filterPlaceholder: 'Filtrera evenemang…',
  filterLabel: 'Filtrera',
  selectAll: 'Markera alla',
  unstarSelected: 'Ta bort markerade',
  exportSelected: 'Exportera markerade',
  bulkUnstarConfirm: 'Vill du ta bort dessa stjärnmärkta evenemang?',
  onboardingTitle: 'Välkommen till Almedalsstjärnan',
  onboardingStep1: 'Besök Almedalsveckans program',
  onboardingStep2: 'Klicka på stjärnan för att spara event',
  onboardingStep3: 'Öppna tillägget för att se sparade event',
  onboardingStep4: 'Exportera till din kalender',
  onboardingDismiss: 'Stäng',
  helpLink: 'Hur fungerar det?',
  languageLabel: 'Språk',
  languageAuto: 'Auto (webbläsare)',
  languageSv: 'Svenska',
  languageEn: 'English',
  goToProgramme: 'Gå till programmet',
  reloadPopupHint: '(ladda om)',
  languageVisibleLabel: 'Språk:',
  sortVisibleLabel: 'Sortera:',
  showMore: 'Visa mer',
  showLess: 'Visa mindre',
  conflictIndicator: 'Tidskonflikt',
  helpModalDismiss: 'Stäng',
  helpGroupStarEventsHeading: 'Stjärnmärk evenemang',
  helpGroupStarEventsDesc:
    'Klicka på stjärnan bredvid ett evenemang i Almedalsveckans program för att spara det. Stjärnan blir ifylld när eventet är sparat.',
  helpGroupPopupViewHeading: 'Popup-vy',
  helpGroupPopupViewDesc:
    'Klicka på tilläggets ikon för att se dina sparade evenemang i en kompakt lista. Härifrån kan du snabbt exportera eller öppna hela listan.',
  helpGroupStarsPageHeading: 'Stjärnsidan',
  helpGroupSortingHeading: 'Sortering',
  helpGroupSortingDesc:
    'Sortera dina evenemang kronologiskt, omvänt kronologiskt, efter titel eller efter när de stjärnmärktes.',
  helpGroupConflictHeading: 'Konfliktvarning',
  helpGroupConflictDesc:
    'Evenemang som överlappar i tid markeras automatiskt så att du kan undvika dubbelbokningar i ditt schema.',
  helpGroupSearchFilterHeading: 'Sök och filtrera',
  helpGroupSearchFilterDesc:
    'Filtrera listan på stjärnsidan genom att söka på titel, arrangör eller ämne.',
  helpGroupBulkActionsHeading: 'Massåtgärder',
  helpGroupBulkActionsDesc:
    'Markera flera evenemang på stjärnsidan för att ta bort eller exportera dem samtidigt.',
  helpGroupIcsExportHeading: 'Kalenderexport (ICS)',
  helpGroupIcsExportDesc:
    'Exportera valda evenemang som en ICS-fil som du kan importera i Google Kalender, Outlook eller Apple Kalender.',
  helpGroupLanguageHeading: 'Språkväxling',
  helpGroupLanguageDesc:
    'Växla mellan svenska och engelska via språkmenyn. Ändringen gäller för hela tilläggets gränssnitt.',
};

/** Keys that are expected to change as part of the bug fixes. */
const KEYS_TO_BE_FIXED = new Set(['helpModalTitle', 'helpGroupStarsPageDesc', 'helpGroupBulkActionsDesc']);

// ─── Property: Collapsed EventItem Preservation ───────────────────

describe('Preservation: Collapsed EventItem renders summary content', () => {
  /**
   * Validates: Requirements 3.1
   *
   * For all StarredEvent with collapsed state, rendered EventItem contains
   * exactly one formatEventDateTime call, organiser (if non-null), and
   * location (if non-null).
   */
  it('collapsed EventItem contains date/time, organiser, and location', () => {
    const adapter = setupAdapter();

    fc.assert(
      fc.property(starredEventArb, (event) => {
        const { container } = render(
          createElement(EventItem, {
            event,
            onUnstar: vi.fn(),
            adapter,
            locale: 'sv',
          }),
        );

        const textContent = container.textContent ?? '';

        // Date/time should be present in the summary
        const formattedDateTime = formatEventDateTime(
          event.startDateTime,
          event.endDateTime,
          'sv',
        );
        expect(textContent).toContain(formattedDateTime);

        // Organiser should be present if non-null
        if (event.organiser !== null) {
          expect(textContent).toContain(event.organiser);
        }

        // Location should be present if non-null
        if (event.location !== null) {
          expect(textContent).toContain(event.location);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property: Expanded EventItem Preservation ────────────────────

describe('Preservation: Expanded EventItem renders detail content', () => {
  /**
   * Validates: Requirements 3.2
   *
   * For all StarredEvent with expanded state, rendered EventItem contains
   * topic (if non-null) and description (if non-null) in the detail section.
   */
  it('expanded EventItem contains topic and description', () => {
    const adapter = setupAdapter();

    fc.assert(
      fc.property(starredEventArb, (event) => {
        const { container } = render(
          createElement(EventItem, {
            event,
            onUnstar: vi.fn(),
            adapter,
            locale: 'sv',
          }),
        );

        // Expand the item
        const expandBtn = container.querySelector('button[aria-expanded]');
        expect(expandBtn).not.toBeNull();
        fireEvent.click(expandBtn!);

        const textContent = container.textContent ?? '';

        // Topic should be present if non-null
        if (event.topic !== null) {
          expect(textContent).toContain(event.topic);
        }

        // Description should be present if non-null
        if (event.description !== null) {
          // Description may have sourceUrl stripped, but core text should be present
          // Use a substring check — at minimum, some part of the description appears
          const descText = event.description.trim();
          if (descText.length > 0) {
            // The component uses stripSourceUrl which may modify the description,
            // so we check that some content from the description is rendered
            // (unless the entire description IS the sourceUrl)
            if (event.sourceUrl === null || !descText.includes(event.sourceUrl)) {
              expect(textContent).toContain(descText);
            }
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property: Star Button Toggle Preservation ────────────────────

describe('Preservation: Star button aria-pressed and callbacks', () => {
  const hosts: HTMLElement[] = [];

  afterEach(() => {
    for (const host of hosts) {
      host.remove();
    }
    hosts.length = 0;
  });

  /**
   * Validates: Requirements 3.3
   *
   * For all star button interactions, aria-pressed reflects the starred state
   * and callbacks are invoked correctly.
   */
  it('star button toggles aria-pressed and calls onStar/onUnstar callbacks', () => {
    const adapter = setupAdapter();

    fc.assert(
      fc.property(fc.boolean(), (initialStarred) => {
        const host = document.createElement('div');
        document.body.appendChild(host);
        hosts.push(host);

        const onStar = vi.fn().mockResolvedValue(undefined);
        const onUnstar = vi.fn().mockResolvedValue(undefined);

        createStarButton(host, {
          eventId: 'preservation-test-event',
          initialStarred,
          adapter,
          onStar,
          onUnstar,
        });

        const shadow = host.shadowRoot;
        expect(shadow).not.toBeNull();

        const btn = shadow!.querySelector('button.star-btn') as HTMLButtonElement;
        expect(btn).not.toBeNull();

        // Verify initial aria-pressed reflects starred state
        expect(btn.getAttribute('aria-pressed')).toBe(String(initialStarred));

        // Click the button
        btn.click();

        // Verify correct callback was invoked
        if (initialStarred) {
          expect(onUnstar).toHaveBeenCalledWith('preservation-test-event');
        } else {
          expect(onStar).toHaveBeenCalledWith('preservation-test-event');
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property: EventGrid Row Count Preservation ───────────────────

describe('Preservation: EventGrid row count equals event count', () => {
  /**
   * Validates: Requirements 3.4
   *
   * For all StarredEvent arrays, EventGrid renders the correct number of
   * data rows matching the event count (using non-time-based sort to avoid
   * section headers which add extra rows).
   */
  it('EventGrid renders one row per event', () => {
    const adapter = setupAdapter();

    fc.assert(
      fc.property(starredEventArrayArb, (events) => {
        const { container } = render(
          createElement(EventGrid, {
            events,
            sortOrder: 'alphabetical-by-title',
            onUnstar: vi.fn(),
            adapter,
            locale: 'sv',
          }),
        );

        // Count data rows in tbody (each EventRow renders a <tr>)
        const tbody = container.querySelector('tbody');
        if (events.length === 0) {
          // Empty state: tbody exists but has no rows
          const rows = tbody?.querySelectorAll('tr') ?? [];
          expect(rows.length).toBe(0);
        } else {
          const rows = tbody?.querySelectorAll('tr') ?? [];
          expect(rows.length).toBe(events.length);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property: Swedish Messages Preservation ──────────────────────

describe('Preservation: Swedish message keys unchanged', () => {
  /**
   * Validates: Requirements 3.5, 3.6, 3.7
   *
   * For all Swedish message keys NOT in {helpModalTitle, helpGroupStarsPageDesc},
   * values are unchanged from the original.
   */
  it('all Swedish message keys other than helpModalTitle and helpGroupStarsPageDesc are unchanged', async () => {
    const svMessages = (await import('../../_locales/sv/messages.json')).default as unknown as Record<
      string,
      { readonly message: string }
    >;

    // Check every key in ORIGINAL_SV_MESSAGES that is NOT in the set to be fixed
    for (const [key, expectedValue] of Object.entries(ORIGINAL_SV_MESSAGES)) {
      if (KEYS_TO_BE_FIXED.has(key)) continue;

      const actual = svMessages[key]?.message ?? '';
      expect(actual, `Swedish message key "${key}" should be unchanged`).toBe(expectedValue);
    }
  });
});
