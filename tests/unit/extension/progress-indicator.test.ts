/**
 * Unit tests for Progress Indicator (Shadow DOM).
 *
 * Tests the createProgressIndicator function which renders an accessible
 * progress display with cancel button inside a Shadow DOM.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.7, 4.8, 4.9
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { createProgressIndicator } from '#extension/progress-indicator';
import type { BulkStarProgress } from '#extension/bulk-star-types';

describe('Progress Indicator', () => {
  let hostElement: HTMLElement;

  beforeEach(() => {
    vi.useFakeTimers();
    hostElement = document.createElement('div');
    document.body.appendChild(hostElement);
  });

  afterEach(() => {
    hostElement.remove();
    vi.useRealTimers();
  });

  function makeProgress(overrides: Partial<BulkStarProgress> = {}): BulkStarProgress {
    return {
      phase: 'loading',
      eventsLoaded: 0,
      eventsProcessed: 0,
      eventsTotal: 0,
      eventsNewlyStarred: 0,
      eventsAlreadyStarred: 0,
      eventsFailed: 0,
      eventsSkipped: 0,
      ...overrides,
    };
  }

  describe('Shadow DOM creation', () => {
    it('creates Shadow DOM with open mode', () => {
      createProgressIndicator(hostElement, {
        locale: 'sv',
        onCancel: vi.fn(),
      });

      expect(hostElement.shadowRoot).not.toBeNull();
      expect(hostElement.shadowRoot!.mode).toBe('open');
    });
  });

  describe('phase rendering — Swedish locale', () => {
    it('shows loading text "Laddar evenemang..." when phase is loading with 0 events', () => {
      const handle = createProgressIndicator(hostElement, {
        locale: 'sv',
        onCancel: vi.fn(),
      });

      handle.update(makeProgress({ phase: 'loading', eventsLoaded: 0 }));

      const textEl = hostElement.shadowRoot!.querySelector('.progress-text')!;
      expect(textEl.textContent).toBe('Laddar evenemang...');
    });

    it('shows events found count "X evenemang hittade" when loading with eventsLoaded > 0', () => {
      const handle = createProgressIndicator(hostElement, {
        locale: 'sv',
        onCancel: vi.fn(),
      });

      handle.update(makeProgress({ phase: 'loading', eventsLoaded: 42 }));

      const textEl = hostElement.shadowRoot!.querySelector('.progress-text')!;
      expect(textEl.textContent).toBe('42 evenemang hittade');
    });

    it('shows progress fraction "X / Y" when phase is starring', () => {
      const handle = createProgressIndicator(hostElement, {
        locale: 'sv',
        onCancel: vi.fn(),
      });

      handle.update(makeProgress({ phase: 'starring', eventsProcessed: 10, eventsTotal: 50 }));

      const textEl = hostElement.shadowRoot!.querySelector('.progress-text')!;
      expect(textEl.textContent).toBe('10 / 50');
    });

    it('shows completion summary when phase is complete', () => {
      const handle = createProgressIndicator(hostElement, {
        locale: 'sv',
        onCancel: vi.fn(),
      });

      handle.update(
        makeProgress({ phase: 'complete', eventsNewlyStarred: 15, eventsAlreadyStarred: 5 }),
      );

      const textEl = hostElement.shadowRoot!.querySelector('.progress-text')!;
      expect(textEl.textContent).toBe('15 nya, 5 redan stjärnmärkta');
    });

    it('shows cancellation summary when phase is cancelled', () => {
      const handle = createProgressIndicator(hostElement, {
        locale: 'sv',
        onCancel: vi.fn(),
      });

      handle.update(makeProgress({ phase: 'cancelled', eventsNewlyStarred: 8, eventsTotal: 20 }));

      const textEl = hostElement.shadowRoot!.querySelector('.progress-text')!;
      expect(textEl.textContent).toBe('Avbrutet: 8 stjärnmärkta av 20');
    });

    it('shows error text when phase is error', () => {
      const handle = createProgressIndicator(hostElement, {
        locale: 'sv',
        onCancel: vi.fn(),
      });

      handle.update(makeProgress({ phase: 'error' }));

      const textEl = hostElement.shadowRoot!.querySelector('.progress-text')!;
      expect(textEl.textContent).toBe('Något gick fel. Försök igen.');
    });
  });

  describe('phase rendering — English locale', () => {
    it('shows "Loading events..." when phase is loading with 0 events', () => {
      const handle = createProgressIndicator(hostElement, {
        locale: 'en',
        onCancel: vi.fn(),
      });

      handle.update(makeProgress({ phase: 'loading', eventsLoaded: 0 }));

      const textEl = hostElement.shadowRoot!.querySelector('.progress-text')!;
      expect(textEl.textContent).toBe('Loading events...');
    });

    it('shows "X events found" when loading with eventsLoaded > 0', () => {
      const handle = createProgressIndicator(hostElement, {
        locale: 'en',
        onCancel: vi.fn(),
      });

      handle.update(makeProgress({ phase: 'loading', eventsLoaded: 100 }));

      const textEl = hostElement.shadowRoot!.querySelector('.progress-text')!;
      expect(textEl.textContent).toBe('100 events found');
    });

    it('shows progress fraction "X / Y" when phase is starring', () => {
      const handle = createProgressIndicator(hostElement, {
        locale: 'en',
        onCancel: vi.fn(),
      });

      handle.update(makeProgress({ phase: 'starring', eventsProcessed: 25, eventsTotal: 150 }));

      const textEl = hostElement.shadowRoot!.querySelector('.progress-text')!;
      expect(textEl.textContent).toBe('25 / 150');
    });

    it('shows "X new, Y already starred" when phase is complete', () => {
      const handle = createProgressIndicator(hostElement, {
        locale: 'en',
        onCancel: vi.fn(),
      });

      handle.update(
        makeProgress({ phase: 'complete', eventsNewlyStarred: 120, eventsAlreadyStarred: 30 }),
      );

      const textEl = hostElement.shadowRoot!.querySelector('.progress-text')!;
      expect(textEl.textContent).toBe('120 new, 30 already starred');
    });

    it('shows "Cancelled: X starred of Y" when phase is cancelled', () => {
      const handle = createProgressIndicator(hostElement, {
        locale: 'en',
        onCancel: vi.fn(),
      });

      handle.update(makeProgress({ phase: 'cancelled', eventsNewlyStarred: 50, eventsTotal: 150 }));

      const textEl = hostElement.shadowRoot!.querySelector('.progress-text')!;
      expect(textEl.textContent).toBe('Cancelled: 50 starred of 150');
    });

    it('shows "Something went wrong. Try again." when phase is error', () => {
      const handle = createProgressIndicator(hostElement, {
        locale: 'en',
        onCancel: vi.fn(),
      });

      handle.update(makeProgress({ phase: 'error' }));

      const textEl = hostElement.shadowRoot!.querySelector('.progress-text')!;
      expect(textEl.textContent).toBe('Something went wrong. Try again.');
    });
  });

  describe('aria-live region', () => {
    it('text region has aria-live="polite"', () => {
      createProgressIndicator(hostElement, {
        locale: 'sv',
        onCancel: vi.fn(),
      });

      const textEl = hostElement.shadowRoot!.querySelector('.progress-text')!;
      expect(textEl.getAttribute('aria-live')).toBe('polite');
    });
  });

  describe('cancel button accessibility', () => {
    it('cancel button has type="button"', () => {
      createProgressIndicator(hostElement, {
        locale: 'sv',
        onCancel: vi.fn(),
      });

      const btn = hostElement.shadowRoot!.querySelector('.cancel-btn')! as HTMLButtonElement;
      expect(btn.getAttribute('type')).toBe('button');
    });

    it('cancel button triggers onCancel callback', () => {
      const onCancel = vi.fn();

      const handle = createProgressIndicator(hostElement, {
        locale: 'sv',
        onCancel,
      });

      // Show the indicator so cancel button is accessible
      handle.update(makeProgress({ phase: 'loading' }));

      const btn = hostElement.shadowRoot!.querySelector('.cancel-btn')! as HTMLButtonElement;
      btn.click();

      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('cancel button visibility', () => {
    it('cancel button is visible during loading phase', () => {
      const handle = createProgressIndicator(hostElement, {
        locale: 'sv',
        onCancel: vi.fn(),
      });

      handle.update(makeProgress({ phase: 'loading' }));

      const btn = hostElement.shadowRoot!.querySelector('.cancel-btn')!;
      expect(btn.classList.contains('hidden')).toBe(false);
    });

    it('cancel button is visible during starring phase', () => {
      const handle = createProgressIndicator(hostElement, {
        locale: 'sv',
        onCancel: vi.fn(),
      });

      handle.update(makeProgress({ phase: 'starring', eventsProcessed: 5, eventsTotal: 20 }));

      const btn = hostElement.shadowRoot!.querySelector('.cancel-btn')!;
      expect(btn.classList.contains('hidden')).toBe(false);
    });

    it('cancel button is hidden during complete phase', () => {
      const handle = createProgressIndicator(hostElement, {
        locale: 'sv',
        onCancel: vi.fn(),
      });

      handle.update(makeProgress({ phase: 'complete' }));

      const btn = hostElement.shadowRoot!.querySelector('.cancel-btn')!;
      expect(btn.classList.contains('hidden')).toBe(true);
    });

    it('cancel button is hidden during cancelled phase', () => {
      const handle = createProgressIndicator(hostElement, {
        locale: 'sv',
        onCancel: vi.fn(),
      });

      handle.update(makeProgress({ phase: 'cancelled' }));

      const btn = hostElement.shadowRoot!.querySelector('.cancel-btn')!;
      expect(btn.classList.contains('hidden')).toBe(true);
    });

    it('cancel button is hidden during error phase', () => {
      const handle = createProgressIndicator(hostElement, {
        locale: 'sv',
        onCancel: vi.fn(),
      });

      handle.update(makeProgress({ phase: 'error' }));

      const btn = hostElement.shadowRoot!.querySelector('.cancel-btn')!;
      expect(btn.classList.contains('hidden')).toBe(true);
    });
  });

  describe('auto-dismiss', () => {
    it('auto-dismisses after 5000ms on complete phase', () => {
      const handle = createProgressIndicator(hostElement, {
        locale: 'sv',
        onCancel: vi.fn(),
      });

      handle.update(makeProgress({ phase: 'complete' }));

      const container = hostElement.shadowRoot!.querySelector('.progress-container')!;
      expect(container.classList.contains('hidden')).toBe(false);

      vi.advanceTimersByTime(5000);

      expect(container.classList.contains('hidden')).toBe(true);
    });

    it('auto-dismisses after 5000ms on cancelled phase', () => {
      const handle = createProgressIndicator(hostElement, {
        locale: 'sv',
        onCancel: vi.fn(),
      });

      handle.update(makeProgress({ phase: 'cancelled' }));

      const container = hostElement.shadowRoot!.querySelector('.progress-container')!;
      expect(container.classList.contains('hidden')).toBe(false);

      vi.advanceTimersByTime(5000);

      expect(container.classList.contains('hidden')).toBe(true);
    });

    it('auto-dismisses after 5000ms on error phase', () => {
      const handle = createProgressIndicator(hostElement, {
        locale: 'sv',
        onCancel: vi.fn(),
      });

      handle.update(makeProgress({ phase: 'error' }));

      const container = hostElement.shadowRoot!.querySelector('.progress-container')!;
      expect(container.classList.contains('hidden')).toBe(false);

      vi.advanceTimersByTime(5000);

      expect(container.classList.contains('hidden')).toBe(true);
    });

    it('clicking container dismisses immediately', () => {
      const handle = createProgressIndicator(hostElement, {
        locale: 'sv',
        onCancel: vi.fn(),
      });

      handle.update(makeProgress({ phase: 'complete' }));

      const container = hostElement.shadowRoot!.querySelector(
        '.progress-container',
      )! as HTMLElement;
      expect(container.classList.contains('hidden')).toBe(false);

      container.click();

      expect(container.classList.contains('hidden')).toBe(true);
    });
  });

  describe('dismiss and destroy', () => {
    it('dismiss() hides the container', () => {
      const handle = createProgressIndicator(hostElement, {
        locale: 'sv',
        onCancel: vi.fn(),
      });

      handle.update(makeProgress({ phase: 'starring', eventsProcessed: 3, eventsTotal: 10 }));

      const container = hostElement.shadowRoot!.querySelector('.progress-container')!;
      expect(container.classList.contains('hidden')).toBe(false);

      handle.dismiss();

      expect(container.classList.contains('hidden')).toBe(true);
    });

    it('destroy() removes host element from the DOM', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const host = document.createElement('div');
      container.appendChild(host);

      const handle = createProgressIndicator(host, {
        locale: 'sv',
        onCancel: vi.fn(),
      });

      expect(container.contains(host)).toBe(true);

      handle.destroy();

      expect(container.contains(host)).toBe(false);
      container.remove();
    });
  });
});
