/**
 * Property-based test for Star Button ARIA state correctness.
 *
 * Feature: almedals-planner-extension, Property 13: Star button ARIA state correctness
 * Validates: Requirements 5.4, 5.5, 14.3, 14.4
 *
 * For any starred/unstarred state, aria-pressed and aria-label are correct.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import fc from 'fast-check';

import type { IBrowserApiAdapter } from '#core/types';
import { createStarButton } from '#extension/star-button';
import { mockBrowserApi } from '#test/helpers/mock-browser-api';

// Feature: almedals-planner-extension, Property 13: Star button ARIA state correctness

describe('Property 13: Star button ARIA state correctness', () => {
  const hosts: HTMLElement[] = [];

  afterEach(() => {
    for (const host of hosts) {
      host.remove();
    }
    hosts.length = 0;
  });

  function createHost(): HTMLElement {
    const host = document.createElement('div');
    document.body.appendChild(host);
    hosts.push(host);
    return host;
  }

  function setupAdapter(): IBrowserApiAdapter {
    const adapter = mockBrowserApi;
    (adapter.getMessage as ReturnType<typeof vi.fn>).mockImplementation(
      (key: string) => {
        if (key === 'starEvent') return 'Star event';
        if (key === 'unstarEvent') return 'Unstar event';
        return '';
      },
    );
    return adapter;
  }

  it('aria-pressed and aria-label are correct for any initial starred state', () => {
    fc.assert(
      fc.property(fc.boolean(), (initialStarred: boolean) => {
        const host = createHost();
        const adapter = setupAdapter();

        createStarButton(host, {
          eventId: 'prop-test-event',
          initialStarred,
          adapter,
          onStar: vi.fn().mockResolvedValue(undefined),
          onUnstar: vi.fn().mockResolvedValue(undefined),
        });

        const shadow = host.shadowRoot;
        expect(shadow).not.toBeNull();

        const btn = shadow!.querySelector('button.star-btn') as HTMLButtonElement;
        expect(btn).not.toBeNull();

        if (initialStarred) {
          expect(btn.getAttribute('aria-pressed')).toBe('true');
          expect(btn.getAttribute('aria-label')).toBe('Unstar event');
        } else {
          expect(btn.getAttribute('aria-pressed')).toBe('false');
          expect(btn.getAttribute('aria-label')).toBe('Star event');
        }
      }),
      { numRuns: 100 },
    );
  });

  it('aria-pressed and aria-label are correct after update() for any state transition', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.boolean(),
        (initialStarred: boolean, updatedStarred: boolean) => {
          const host = createHost();
          const adapter = setupAdapter();

          const { update } = createStarButton(host, {
            eventId: 'prop-test-event',
            initialStarred,
            adapter,
            onStar: vi.fn().mockResolvedValue(undefined),
            onUnstar: vi.fn().mockResolvedValue(undefined),
          });

          update(updatedStarred);

          const btn = host.shadowRoot!.querySelector(
            'button.star-btn',
          ) as HTMLButtonElement;

          if (updatedStarred) {
            expect(btn.getAttribute('aria-pressed')).toBe('true');
            expect(btn.getAttribute('aria-label')).toBe('Unstar event');
          } else {
            expect(btn.getAttribute('aria-pressed')).toBe('false');
            expect(btn.getAttribute('aria-label')).toBe('Star event');
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('aria-pressed and aria-label remain correct after multiple sequential updates', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.array(fc.boolean(), { minLength: 1, maxLength: 20 }),
        (initialStarred: boolean, updates: boolean[]) => {
          const host = createHost();
          const adapter = setupAdapter();

          const { update } = createStarButton(host, {
            eventId: 'prop-test-event',
            initialStarred,
            adapter,
            onStar: vi.fn().mockResolvedValue(undefined),
            onUnstar: vi.fn().mockResolvedValue(undefined),
          });

          for (const starred of updates) {
            update(starred);
          }

          const finalState = updates[updates.length - 1]!;
          const btn = host.shadowRoot!.querySelector(
            'button.star-btn',
          ) as HTMLButtonElement;

          if (finalState) {
            expect(btn.getAttribute('aria-pressed')).toBe('true');
            expect(btn.getAttribute('aria-label')).toBe('Unstar event');
          } else {
            expect(btn.getAttribute('aria-pressed')).toBe('false');
            expect(btn.getAttribute('aria-label')).toBe('Star event');
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
