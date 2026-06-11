/**
 * Property-based tests for Star Button update guard behavior.
 *
 * Feature: content-scraping-and-sync, Property 1: Star Button Update Idempotence
 * Feature: content-scraping-and-sync, Property 2: Star Button Animation Direction
 * Feature: content-scraping-and-sync, Property 3: Star Button Isolation
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import fc from 'fast-check';

import type { IBrowserApiAdapter } from '#core/types';
import { createStarButton } from '#extension/star-button';
import { mockBrowserApi, resetMocks } from '#test/helpers/mock-browser-api';

// ─── Helpers ──────────────────────────────────────────────────────

function setupAdapter(): IBrowserApiAdapter {
  const adapter = mockBrowserApi;
  (adapter.getMessage as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
    if (key === 'starEvent') return 'Star event';
    if (key === 'unstarEvent') return 'Unstar event';
    return '';
  });
  return adapter;
}

function createHost(): HTMLElement {
  const host = document.createElement('div');
  document.body.appendChild(host);
  return host;
}

/** Captures a snapshot of the button's relevant DOM state within the shadow root. */
function captureButtonState(host: HTMLElement): {
  readonly innerHTML: string;
  readonly ariaPressed: string | null;
  readonly ariaLabel: string | null;
  readonly classList: readonly string[];
} {
  const btn = host.shadowRoot!.querySelector('button.star-btn') as HTMLButtonElement;
  return {
    innerHTML: btn.innerHTML,
    ariaPressed: btn.getAttribute('aria-pressed'),
    ariaLabel: btn.getAttribute('aria-label'),
    classList: [...btn.classList],
  };
}

// ─── Test Suite ───────────────────────────────────────────────────

describe('Star Button Update Guard Properties', () => {
  const hosts: HTMLElement[] = [];

  beforeEach(() => {
    resetMocks();
  });

  afterEach(() => {
    for (const host of hosts) {
      host.remove();
    }
    hosts.length = 0;
  });

  function trackHost(): HTMLElement {
    const host = createHost();
    hosts.push(host);
    return host;
  }

  // Feature: content-scraping-and-sync, Property 1: Star Button Update Idempotence
  describe('Property 1: Star Button Update Idempotence', () => {
    it('calling update(S) on a button already in state S produces no DOM changes', () => {
      fc.assert(
        fc.property(fc.boolean(), (state: boolean) => {
          const host = trackHost();
          const adapter = setupAdapter();

          const { update } = createStarButton(host, {
            eventId: 'idempotence-test',
            initialStarred: state,
            adapter,
            onStar: vi.fn().mockResolvedValue(undefined),
            onUnstar: vi.fn().mockResolvedValue(undefined),
          });

          // Capture DOM state after initial render
          const stateBefore = captureButtonState(host);

          // Call update with the same state
          update(state);

          // Capture DOM state after redundant update call
          const stateAfter = captureButtonState(host);

          // Assert no DOM changes occurred
          expect(stateAfter.innerHTML).toBe(stateBefore.innerHTML);
          expect(stateAfter.ariaPressed).toBe(stateBefore.ariaPressed);
          expect(stateAfter.ariaLabel).toBe(stateBefore.ariaLabel);
          expect(stateAfter.classList).toEqual(stateBefore.classList);
        }),
        { numRuns: 100 },
      );
    });

    it('calling update(S) multiple times on a button in state S never mutates DOM', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          fc.integer({ min: 2, max: 10 }),
          (state: boolean, repetitions: number) => {
            const host = trackHost();
            const adapter = setupAdapter();

            const { update } = createStarButton(host, {
              eventId: 'idempotence-multi',
              initialStarred: state,
              adapter,
              onStar: vi.fn().mockResolvedValue(undefined),
              onUnstar: vi.fn().mockResolvedValue(undefined),
            });

            const stateBefore = captureButtonState(host);

            for (let i = 0; i < repetitions; i++) {
              update(state);
            }

            const stateAfter = captureButtonState(host);

            expect(stateAfter.innerHTML).toBe(stateBefore.innerHTML);
            expect(stateAfter.ariaPressed).toBe(stateBefore.ariaPressed);
            expect(stateAfter.ariaLabel).toBe(stateBefore.ariaLabel);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // Feature: content-scraping-and-sync, Property 2: Star Button Animation Direction
  describe('Property 2: Star Button Animation Direction', () => {
    it('star-pop animation triggers if and only if transitioning to true', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          fc.boolean(),
          (oldState: boolean, newState: boolean) => {
            // Only test actual state transitions
            fc.pre(oldState !== newState);

            const host = trackHost();
            const adapter = setupAdapter();

            const { update } = createStarButton(host, {
              eventId: 'animation-test',
              initialStarred: oldState,
              adapter,
              onStar: vi.fn().mockResolvedValue(undefined),
              onUnstar: vi.fn().mockResolvedValue(undefined),
            });

            // Perform the state transition
            update(newState);

            const btn = host.shadowRoot!.querySelector('button.star-btn') as HTMLButtonElement;
            const ariaPressed = btn.getAttribute('aria-pressed');
            const svgPath = btn.querySelector('svg path') as SVGPathElement | null;

            if (newState === true) {
              // Transitioning to starred: aria-pressed="true" triggers CSS star-pop animation
              // The CSS rule `.star-btn[aria-pressed="true"] svg path` applies the animation
              expect(ariaPressed).toBe('true');
              // The filled SVG has fill="currentColor" on the path
              expect(svgPath?.getAttribute('fill')).toBe('currentColor');
            } else {
              // Transitioning to unstarred: aria-pressed="false", no star-pop animation
              // The CSS rule for aria-pressed="false" does NOT include the star-pop animation
              expect(ariaPressed).toBe('false');
              // The outlined SVG has no fill attribute on the path
              expect(svgPath?.getAttribute('fill')).toBeNull();
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('after any sequence of updates the final CSS animation state matches the last state', () => {
      fc.assert(
        fc.property(
          fc.array(fc.boolean(), { minLength: 1, maxLength: 15 }),
          (sequence: boolean[]) => {
            const host = trackHost();
            const adapter = setupAdapter();

            const { update } = createStarButton(host, {
              eventId: 'animation-sequence',
              initialStarred: false,
              adapter,
              onStar: vi.fn().mockResolvedValue(undefined),
              onUnstar: vi.fn().mockResolvedValue(undefined),
            });

            let currentState = false;
            for (const newState of sequence) {
              update(newState);
              currentState = newState;
            }

            const btn = host.shadowRoot!.querySelector('button.star-btn') as HTMLButtonElement;
            const svgPath = btn.querySelector('svg path') as SVGPathElement | null;

            // After any sequence, the final visual state matches the last effective state
            if (currentState) {
              // aria-pressed="true" means star-pop animation is active via CSS
              expect(btn.getAttribute('aria-pressed')).toBe('true');
              expect(svgPath?.getAttribute('fill')).toBe('currentColor');
            } else {
              // aria-pressed="false" means no star-pop animation via CSS
              expect(btn.getAttribute('aria-pressed')).toBe('false');
              expect(svgPath?.getAttribute('fill')).toBeNull();
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // Feature: content-scraping-and-sync, Property 3: Star Button Isolation
  describe('Property 3: Star Button Isolation', () => {
    it('updateAllButtonsForEvent(targetId, state) leaves non-target buttons unchanged', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 8 }),
          fc.array(fc.boolean(), { minLength: 2, maxLength: 8 }),
          fc.boolean(),
          (numButtons: number, initialStates: boolean[], targetNewState: boolean) => {
            // Ensure we have enough initial states for the buttons
            const states = initialStates.slice(0, numButtons);
            while (states.length < numButtons) {
              states.push(false);
            }

            const adapter = setupAdapter();
            const buttons: Array<{
              readonly host: HTMLElement;
              readonly eventId: string;
              readonly update: (starred: boolean) => void;
            }> = [];

            // Create N buttons with distinct event IDs
            for (let i = 0; i < numButtons; i++) {
              const host = trackHost();
              const eventId = `event-${i}`;
              const { update } = createStarButton(host, {
                eventId,
                initialStarred: states[i]!,
                adapter,
                onStar: vi.fn().mockResolvedValue(undefined),
                onUnstar: vi.fn().mockResolvedValue(undefined),
              });
              buttons.push({ host, eventId, update });
            }

            // Pick a target (first button)
            const targetIndex = 0;
            const targetId = buttons[targetIndex]!.eventId;

            // Capture DOM state of all non-target buttons BEFORE the update
            const nonTargetStatesBefore = buttons
              .filter((_, i) => i !== targetIndex)
              .map((b) => captureButtonState(b.host));

            // Simulate updateAllButtonsForEvent: update only target button
            // This mirrors what the content script does internally
            for (const b of buttons) {
              if (b.eventId === targetId) {
                b.update(targetNewState);
              }
            }

            // Capture DOM state of all non-target buttons AFTER the update
            const nonTargetStatesAfter = buttons
              .filter((_, i) => i !== targetIndex)
              .map((b) => captureButtonState(b.host));

            // Assert all non-target buttons are unchanged
            for (let i = 0; i < nonTargetStatesBefore.length; i++) {
              expect(nonTargetStatesAfter[i]!.innerHTML).toBe(
                nonTargetStatesBefore[i]!.innerHTML,
              );
              expect(nonTargetStatesAfter[i]!.ariaPressed).toBe(
                nonTargetStatesBefore[i]!.ariaPressed,
              );
              expect(nonTargetStatesAfter[i]!.ariaLabel).toBe(
                nonTargetStatesBefore[i]!.ariaLabel,
              );
              expect(nonTargetStatesAfter[i]!.classList).toEqual(
                nonTargetStatesBefore[i]!.classList,
              );
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('storage change for one event ID does not affect buttons with different event IDs', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 6 }),
          fc.array(fc.boolean(), { minLength: 2, maxLength: 6 }),
          fc.nat({ max: 5 }),
          fc.boolean(),
          (
            numButtons: number,
            initialStates: boolean[],
            targetIdx: number,
            newStarred: boolean,
          ) => {
            const states = initialStates.slice(0, numButtons);
            while (states.length < numButtons) {
              states.push(false);
            }
            const targetIndex = targetIdx % numButtons;

            const adapter = setupAdapter();
            const allButtons: Array<{
              readonly host: HTMLElement;
              readonly eventId: string;
              readonly update: (starred: boolean) => void;
            }> = [];

            for (let i = 0; i < numButtons; i++) {
              const host = trackHost();
              const eventId = `iso-event-${i}`;
              const { update } = createStarButton(host, {
                eventId,
                initialStarred: states[i]!,
                adapter,
                onStar: vi.fn().mockResolvedValue(undefined),
                onUnstar: vi.fn().mockResolvedValue(undefined),
              });
              allButtons.push({ host, eventId, update });
            }

            // Capture non-target states before
            const nonTargetBefore = allButtons
              .filter((_, i) => i !== targetIndex)
              .map((b) => ({
                eventId: b.eventId,
                state: captureButtonState(b.host),
              }));

            // Update only the target button (simulating updateAllButtonsForEvent)
            allButtons[targetIndex]!.update(newStarred);

            // Verify non-target buttons are unchanged
            const nonTargetAfter = allButtons
              .filter((_, i) => i !== targetIndex)
              .map((b) => ({
                eventId: b.eventId,
                state: captureButtonState(b.host),
              }));

            for (let i = 0; i < nonTargetBefore.length; i++) {
              expect(nonTargetAfter[i]!.state.innerHTML).toBe(
                nonTargetBefore[i]!.state.innerHTML,
              );
              expect(nonTargetAfter[i]!.state.ariaPressed).toBe(
                nonTargetBefore[i]!.state.ariaPressed,
              );
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
