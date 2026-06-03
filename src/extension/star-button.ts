/**
 * Star Button — Shadow DOM isolated toggle button.
 *
 * Creates and manages a star button inside a Shadow DOM for complete
 * style isolation from the host page. Uses plain scoped CSS (no Tailwind).
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 14.1, 14.2, 14.3, 14.4
 */

import type { IBrowserApiAdapter } from '#core/types';

// ─── SVG Constants ────────────────────────────────────────────────

/** Inline SVG for outlined (unstarred) star, 16px viewBox */
export const STAR_OUTLINED_SVG =
  '<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M8 1.5l1.85 3.75 4.15.6-3 2.93.71 4.12L8 10.77 4.29 12.9l.71-4.12-3-2.93 4.15-.6L8 1.5z"/></svg>';

/** Inline SVG for filled (starred) star, 16px viewBox */
export const STAR_FILLED_SVG =
  '<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M8 1.5l1.85 3.75 4.15.6-3 2.93.71 4.12L8 10.77 4.29 12.9l.71-4.12-3-2.93 4.15-.6L8 1.5z" fill="currentColor"/></svg>';

// ─── Scoped CSS (inlined since this runs in content script context) ──

const STAR_BUTTON_CSS = `.star-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.15s ease;
}
.star-btn:hover {
  background-color: rgba(0, 0, 0, 0.06);
}
.star-btn:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
.star-btn svg {
  width: 16px;
  height: 16px;
}
.star-btn[aria-pressed="true"] svg path {
  fill: #f59e0b;
  stroke: #1e3a5f;
  stroke-width: 1.5;
  stroke-linejoin: round;
  animation: star-pop 0.3s ease-out;
}
.star-btn[aria-pressed="false"] svg path {
  fill: none;
  stroke: #6b7280;
  stroke-width: 1.5;
}
@keyframes star-pop {
  0% { transform: scale(1); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
}
@keyframes star-error-flash {
  0% { background-color: transparent; }
  50% { background-color: rgba(239, 68, 68, 0.2); }
  100% { background-color: transparent; }
}
.star-btn--error {
  animation: star-error-flash 0.6s ease-out;
}`;

// ─── Star Button Options ──────────────────────────────────────────

export interface StarButtonOptions {
  readonly eventId: string;
  readonly initialStarred: boolean;
  readonly adapter: IBrowserApiAdapter;
  readonly onStar: (eventId: string) => Promise<void>;
  readonly onUnstar: (eventId: string) => Promise<void>;
}

// ─── Error Flash Helper ───────────────────────────────────────────

/**
 * Adds the error flash CSS class to a button element and removes it
 * after the animation completes.
 */
function flashError(button: HTMLButtonElement): void {
  button.classList.add('star-btn--error');
  const onAnimationEnd = (): void => {
    button.classList.remove('star-btn--error');
    button.removeEventListener('animationend', onAnimationEnd);
  };
  button.addEventListener('animationend', onAnimationEnd);
  // Fallback: remove class after 700ms if animationend doesn't fire (e.g., in test env)
  setTimeout(() => {
    button.classList.remove('star-btn--error');
  }, 700);
}

// ─── Factory Function ─────────────────────────────────────────────

/**
 * Creates and manages a star button inside a Shadow DOM.
 *
 * @param hostElement - The DOM element to attach the shadow root to
 * @param options - Configuration including eventId, initial state, adapter, and callbacks
 * @returns Object with `update(starred)` to change visual state and `destroy()` to remove
 */
export function createStarButton(
  hostElement: Element,
  options: StarButtonOptions,
): { readonly update: (starred: boolean) => void; readonly destroy: () => void } {
  const { eventId, initialStarred, adapter, onStar, onUnstar } = options;

  let starred = initialStarred;

  // Create open Shadow DOM
  const shadowRoot = hostElement.attachShadow({ mode: 'open' });

  // Inject scoped CSS
  const styleEl = document.createElement('style');
  styleEl.textContent = STAR_BUTTON_CSS;
  shadowRoot.appendChild(styleEl);

  // Create button element
  const button = document.createElement('button');
  button.className = 'star-btn';
  button.setAttribute('type', 'button');
  shadowRoot.appendChild(button);

  // Render the button state
  function render(): void {
    button.setAttribute('aria-pressed', String(starred));
    button.setAttribute(
      'aria-label',
      starred ? adapter.getMessage('unstarEvent') : adapter.getMessage('starEvent'),
    );
    button.innerHTML = starred ? STAR_FILLED_SVG : STAR_OUTLINED_SVG;
  }

  // Wire click handler
  function handleClick(): void {
    if (starred) {
      void (async () => {
        try {
          await onUnstar(eventId);
        } catch {
          // Revert to original state and flash error
          starred = true;
          render();
          flashError(button);
          console.warn('[Almedalsstjärnan] onUnstar failed for event:', eventId);
        }
      })();
    } else {
      void (async () => {
        try {
          await onStar(eventId);
        } catch {
          // Revert to original state and flash error
          starred = false;
          render();
          flashError(button);
          console.warn('[Almedalsstjärnan] onStar failed for event:', eventId);
        }
      })();
    }
  }

  button.addEventListener('click', handleClick);

  // Initial render
  render();

  return {
    update(newStarred: boolean): void {
      starred = newStarred;
      render();
    },
    destroy(): void {
      button.removeEventListener('click', handleClick);
      hostElement.remove();
    },
  };
}
