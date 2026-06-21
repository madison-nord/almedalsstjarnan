/**
 * Bulk Star Button — Shadow DOM isolated action button.
 *
 * Creates and manages an inline text button inside a Shadow DOM for complete
 * style isolation from the host page. Positioned near the search/filter area
 * in the page flow. Uses plain scoped CSS (no Tailwind). Visually distinct
 * from the circular Star_Buttons.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */

import { getLocalizedMessage } from '#core/locale-messages';
import type { SupportedLocale } from '#core/locale-messages';

// ─── Interfaces ───────────────────────────────────────────────────

export interface BulkStarButtonOptions {
  readonly locale: SupportedLocale;
  readonly onActivate: () => void;
}

export interface BulkStarButtonHandle {
  readonly setDisabled: (disabled: boolean) => void;
  readonly setVisible: (visible: boolean) => void;
  readonly destroy: () => void;
}

// ─── Scoped CSS ───────────────────────────────────────────────────

const BULK_STAR_BUTTON_CSS = `
:host {
  display: block;
  margin: 12px 0;
}
:host([data-hidden="true"]) {
  display: none;
}
.bulk-star-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 44px;
  min-height: 48px;
  padding: 12px 24px;
  border: none;
  border-radius: 24px;
  background-color: #f59e0b;
  color: #1e293b;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.2;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25), 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: background-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
}
.bulk-star-btn:hover {
  background-color: #d97706;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3), 0 3px 6px rgba(0, 0, 0, 0.15);
}
.bulk-star-btn:active {
  background-color: #b45309;
  transform: translateY(0);
}
.bulk-star-btn:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
.bulk-star-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}
.bulk-star-btn .star-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}
`;

// ─── Factory Function ─────────────────────────────────────────────

/**
 * Creates and manages a bulk star button inside a Shadow DOM.
 *
 * @param hostElement - The DOM element to attach the shadow root to
 * @param options - Configuration including locale and activation callback
 * @returns Handle with `setDisabled`, `setVisible`, and `destroy` methods
 */
export function createBulkStarButton(
  hostElement: Element,
  options: BulkStarButtonOptions,
): BulkStarButtonHandle {
  const { locale, onActivate } = options;

  const label = getLocalizedMessage('bulkStarAll', locale);

  // Create open Shadow DOM
  const shadowRoot = hostElement.attachShadow({ mode: 'open' });

  // Inject scoped CSS
  const styleEl = document.createElement('style');
  styleEl.textContent = BULK_STAR_BUTTON_CSS;
  shadowRoot.appendChild(styleEl);

  // Create button element
  const button = document.createElement('button');
  button.className = 'bulk-star-btn';
  button.setAttribute('type', 'button');
  button.setAttribute('aria-label', label);
  button.innerHTML = `<svg class="star-icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M8 1.5l1.85 3.75 4.15.6-3 2.93.71 4.12L8 10.77 4.29 12.9l.71-4.12-3-2.93 4.15-.6L8 1.5z" fill="currentColor"/></svg><span>${label}</span>`;
  shadowRoot.appendChild(button);

  // Wire click handler
  function handleClick(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    if (!button.disabled) {
      onActivate();
    }
  }

  button.addEventListener('click', handleClick);

  return {
    setDisabled(disabled: boolean): void {
      button.disabled = disabled;
      button.setAttribute('aria-disabled', String(disabled));
    },
    setVisible(visible: boolean): void {
      if (visible) {
        hostElement.removeAttribute('data-hidden');
      } else {
        hostElement.setAttribute('data-hidden', 'true');
      }
    },
    destroy(): void {
      button.removeEventListener('click', handleClick);
      hostElement.remove();
    },
  };
}
