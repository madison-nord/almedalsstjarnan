/**
 * Property-based test for Bulk Star Button visibility.
 *
 * Feature: bulk-star-filtered, Property 1: Bulk button visibility tracks Event_Card presence
 * Validates: Requirements 1.4, 1.6
 *
 * For any Programme_Page DOM state with N Event_Cards (where N ≥ 0),
 * the Bulk_Star_Button SHALL be visible if and only if N > 0.
 */

import { describe, it, expect, afterEach } from 'vitest';
import fc from 'fast-check';

import { createBulkStarButton } from '#extension/bulk-star-button';
import type { BulkStarButtonHandle } from '#extension/bulk-star-button';

// Feature: bulk-star-filtered, Property 1: Bulk button visibility tracks Event_Card presence

describe('Property 1: Bulk button visibility tracks Event_Card presence', () => {
  const hosts: HTMLElement[] = [];

  afterEach(() => {
    for (const host of hosts) {
      host.remove();
    }
    hosts.length = 0;
    document.body.innerHTML = '';
  });

  function createHost(): HTMLElement {
    const host = document.createElement('div');
    document.body.appendChild(host);
    hosts.push(host);
    return host;
  }

  /**
   * Creates N Event_Card elements in the DOM.
   * Each Event_Card is an `li` element containing a `.event-information` div.
   */
  function populateEventCards(n: number): void {
    const container = document.createElement('ul');
    for (let i = 0; i < n; i++) {
      const li = document.createElement('li');
      li.id = `event_card_${i}`;
      const infoDiv = document.createElement('div');
      infoDiv.className = 'event-information';
      li.appendChild(infoDiv);
      container.appendChild(li);
    }
    document.body.appendChild(container);
  }

  /**
   * Determines the visibility rule: button should be visible iff N > 0.
   * Then calls setVisible accordingly and verifies the host element's
   * data-hidden attribute matches the expected state.
   */
  it('setVisible(N > 0) correctly sets host data-hidden attribute for any N Event_Cards', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 50 }), (numCards: number) => {
        // Clean DOM for each iteration
        document.body.innerHTML = '';
        hosts.length = 0;

        // Set up DOM with N event cards
        populateEventCards(numCards);

        // Create the bulk star button
        const host = createHost();
        const handle: BulkStarButtonHandle = createBulkStarButton(host, {
          locale: 'sv',
          onActivate: () => {},
        });

        // Determine expected visibility based on Event_Card count
        const shouldBeVisible = numCards > 0;

        // Apply the visibility rule (this is what the content script does)
        handle.setVisible(shouldBeVisible);

        // Verify: when visible, data-hidden should be absent
        // When hidden, data-hidden should be "true"
        if (shouldBeVisible) {
          expect(host.hasAttribute('data-hidden')).toBe(false);
        } else {
          expect(host.getAttribute('data-hidden')).toBe('true');
        }

        // Clean up shadow DOM
        handle.destroy();
      }),
      { numRuns: 100 },
    );
  });

  it('visibility toggles correctly when Event_Cards are added or removed', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 50 }), { minLength: 1, maxLength: 10 }),
        (cardCounts: number[]) => {
          // Clean DOM for each iteration
          document.body.innerHTML = '';
          hosts.length = 0;

          // Create the bulk star button once
          const host = createHost();
          const handle: BulkStarButtonHandle = createBulkStarButton(host, {
            locale: 'en',
            onActivate: () => {},
          });

          // Simulate a sequence of DOM states with varying Event_Card counts
          for (const count of cardCounts) {
            // Clear existing event cards (keep the button host)
            const existingContainers = document.querySelectorAll('ul');
            for (const container of existingContainers) {
              container.remove();
            }

            // Populate new event cards
            populateEventCards(count);

            // Query DOM for event cards (same logic content script uses)
            const eventCards = document.querySelectorAll('li .event-information');
            const shouldBeVisible = eventCards.length > 0;

            // Apply visibility rule
            handle.setVisible(shouldBeVisible);

            // Verify
            if (shouldBeVisible) {
              expect(host.hasAttribute('data-hidden')).toBe(false);
            } else {
              expect(host.getAttribute('data-hidden')).toBe('true');
            }
          }

          // Clean up
          handle.destroy();
        },
      ),
      { numRuns: 100 },
    );
  });
});
