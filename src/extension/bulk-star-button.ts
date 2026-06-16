/**
 * Bulk Star Button — Shadow DOM isolated action button.
 *
 * Creates and manages a fixed-position rectangular text button inside a
 * Shadow DOM for complete style isolation from the host page. Uses plain
 * scoped CSS (no Tailwind). Visually distinct from the circular Star_Buttons.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */

import { getLocalizedMessage } from '#core/locale-messages';
import type { SupportedLocale } from '#core/locale-messages';
import { BULK_STAR_CONSTANTS } from '#extension/bulk-star-constants';

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
  position: fixed;
  top: ${BULK_STAR_CONSTANTS.BUTTON_VIEWPORT_OFFSET_PX}px;
  right: ${BULK_STAR_CONSTANTS.BUTTON_VIEWPORT_OFFSET_PX}px;
  z-index: 2147483647;
}
:host([data-hidden="true"]) {
  display: none;
}
.bulk-star-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  background-color: #1e3a5f;
  color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.2;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.15s ease, opacity 0.15s ease;
}
.bulk-star-btn:hover {
  background-color: #2a4f7a;
}
.bulk-star-btn:active {
  background-color: #162d4a;
}
.bulk-star-btn:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
.bulk-star-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
  button.textContent = label;
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
