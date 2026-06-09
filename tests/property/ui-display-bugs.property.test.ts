/**
 * Bug Condition Exploration Tests — UI Display Bugs.
 *
 * Feature: almedals-planner-extension, Property 1: Bug Condition
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4
 *
 * These tests encode the EXPECTED (correct) behavior. They are expected to FAIL
 * on unfixed code, proving that the four bugs exist. After fixes are applied,
 * they should PASS.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import fc from 'fast-check';
import { createElement } from 'react';
import { render, fireEvent } from '@testing-library/react';

import type { IBrowserApiAdapter } from '#core/types';
import { formatEventDateTime } from '#core/date-formatter';
import { createStarButton } from '#extension/star-button';
import { EventItem } from '#ui/popup/components/EventItem';
import { EventRow } from '#ui/stars/components/EventRow';
import { mockBrowserApi } from '#test/helpers/mock-browser-api';
import { starredEventArb } from '#test/helpers/event-generators';

// Feature: almedals-planner-extension, Property 1: Bug Condition

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
    return '';
  });
  return adapter;
}

// ─── Test 1a: Duplicate Date/Time in Expanded Popup ───────────────

describe('Bug 1: Duplicate DateTime in expanded popup', () => {
  /**
   * Validates: Requirements 1.1
   *
   * Bug Condition: expanded = true AND startDateTime IS NOT NULL AND endDateTime IS NOT NULL
   * Expected: formatEventDateTime output appears exactly once in rendered output
   * Current: Appears twice (once in summary, once in expanded detail) — will FAIL
   */
  it('formatEventDateTime output appears exactly once when expanded', () => {
    const adapter = setupAdapter();

    // Generate events that have both startDateTime and endDateTime (non-null)
    const eventWithBothDatesArb = starredEventArb.filter(
      (e) => e.startDateTime !== null && e.endDateTime !== null,
    );

    fc.assert(
      fc.property(eventWithBothDatesArb, (event) => {
        const { container } = render(
          createElement(EventItem, {
            event,
            onUnstar: vi.fn(),
            adapter,
            locale: 'sv',
          }),
        );

        // Simulate expanded state: click the expand toggle
        const expandBtn = container.querySelector('button[aria-expanded]');
        expect(expandBtn).not.toBeNull();
        fireEvent.click(expandBtn!);

        // Now count occurrences of the formatted date/time string
        const formattedDateTime = formatEventDateTime(
          event.startDateTime,
          event.endDateTime,
          'sv',
        );
        const textContent = container.textContent ?? '';
        const occurrences = textContent.split(formattedDateTime).length - 1;

        // Should appear exactly once (in summary area only, NOT repeated in detail)
        expect(occurrences).toBe(1);
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Test 1b: Star Click Propagation ──────────────────────────────

describe('Bug 2: Star click propagates to parent', () => {
  const hosts: HTMLElement[] = [];

  afterEach(() => {
    for (const host of hosts) {
      host.remove();
    }
    hosts.length = 0;
  });

  /**
   * Validates: Requirements 1.2
   *
   * Bug Condition: clickTarget = "star-button" AND context = "programme-page"
   * Expected: Parent click listener is NOT triggered
   * Current: Click propagates through Shadow DOM to parent — will FAIL
   */
  it('star button click does not propagate to parent elements', () => {
    const adapter = setupAdapter();

    fc.assert(
      fc.property(fc.boolean(), (initialStarred) => {
        // Create a parent element that simulates a programme page card
        const parent = document.createElement('div');
        document.body.appendChild(parent);

        let parentClicked = false;
        parent.addEventListener('click', () => {
          parentClicked = true;
        });

        // Create the host element inside the parent (mimics real injection)
        const host = document.createElement('span');
        parent.appendChild(host);
        hosts.push(parent);

        createStarButton(host, {
          eventId: 'test-event-propagation',
          initialStarred,
          adapter,
          onStar: vi.fn().mockResolvedValue(undefined),
          onUnstar: vi.fn().mockResolvedValue(undefined),
        });

        // Click the star button inside shadow DOM
        const shadow = host.shadowRoot;
        expect(shadow).not.toBeNull();
        const btn = shadow!.querySelector('button.star-btn') as HTMLButtonElement;
        expect(btn).not.toBeNull();
        btn.click();

        // Parent should NOT have been triggered
        expect(parentClicked).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Test 1c: Missing Expansion on Stars Page ─────────────────────

describe('Bug 3: Missing expand/collapse toggle on EventRow', () => {
  /**
   * Validates: Requirements 1.3
   *
   * Bug Condition: page = "stars" AND event has description/topic
   * Expected: An expand/collapse toggle button with aria-expanded exists
   * Current: No such toggle exists — will FAIL
   */
  it('EventRow renders an expand/collapse toggle with aria-expanded', () => {
    const adapter = setupAdapter();

    // Generate events that have description or topic (non-null)
    const eventWithDetailsArb = starredEventArb.filter(
      (e) => e.description !== null || e.topic !== null,
    );

    fc.assert(
      fc.property(eventWithDetailsArb, (event) => {
        const { container } = render(
          createElement(
            'table',
            null,
            createElement(
              'tbody',
              null,
              createElement(EventRow, {
                event,
                onUnstar: vi.fn(),
                adapter,
                locale: 'sv',
              }),
            ),
          ),
        );

        // Query for a button with aria-expanded attribute
        const expandToggle = container.querySelector('button[aria-expanded]');
        expect(expandToggle).not.toBeNull();
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Test 1d: Inconsistent Swedish Translations ───────────────────

describe('Bug 4: Inconsistent Swedish help translations', () => {
  /**
   * Validates: Requirements 1.4
   *
   * Bug Condition: locale = "sv" AND key IN {helpModalTitle, helpGroupStarsPageDesc}
   * Expected: helpModalTitle uses question framing matching English, and
   *           helpGroupStarsPageDesc references 'Öppna hela listan' specifically
   * Current: helpModalTitle = "Snabbguide", helpGroupStarsPageDesc says "via länken" — will FAIL
   */
  it('Swedish helpModalTitle uses question framing', async () => {
    // Load the actual Swedish messages
    const svMessages = (await import('../../_locales/sv/messages.json')) as Record<
      string,
      { readonly message: string }
    >;

    const helpModalTitle = svMessages['helpModalTitle']?.message ?? '';

    // The title should match the English question framing: "Vad kan Almedalsstjärnan göra?"
    expect(helpModalTitle).toBe('Vad kan Almedalsstjärnan göra?');
  });

  it('Swedish helpGroupStarsPageDesc references "Öppna hela listan"', async () => {
    // Load the actual Swedish messages
    const svMessages = (await import('../../_locales/sv/messages.json')) as Record<
      string,
      { readonly message: string }
    >;

    const helpGroupStarsPageDesc = svMessages['helpGroupStarsPageDesc']?.message ?? '';

    // Should clearly reference the button name 'Öppna hela listan'
    expect(helpGroupStarsPageDesc).toContain("'Öppna hela listan'");
  });
});
