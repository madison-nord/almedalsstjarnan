/**
 * Progress Indicator — Shadow DOM isolated floating progress display.
 *
 * Shows phase-dependent text, a cancel button, and aria-live announcements
 * during bulk-star operations. Auto-dismisses after completion/cancellation.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.7, 4.8, 4.9
 */

import type { SupportedLocale } from '#core/locale-messages';
import { getLocalizedMessage } from '#core/locale-messages';
import type { BulkStarProgress } from '#extension/bulk-star-types';
import { BULK_STAR_CONSTANTS } from '#extension/bulk-star-constants';

// ─── Interfaces ───────────────────────────────────────────────────

export interface ProgressIndicatorOptions {
  readonly locale: SupportedLocale;
  readonly onCancel: () => void;
}

export interface ProgressIndicatorHandle {
  readonly update: (progress: BulkStarProgress) => void;
  readonly dismiss: () => void;
  readonly destroy: () => void;
}

// ─── Scoped CSS ───────────────────────────────────────────────────

const PROGRESS_INDICATOR_CSS = `
:host {
  all: initial;
  display: block;
}

.progress-container {
  position: fixed;
  bottom: 16px;
  right: 16px;
  z-index: 2147483647;
  background: #1e293b;
  color: #f1f5f9;
  border-radius: 8px;
  padding: 12px 16px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.4;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  min-width: 200px;
  max-width: 320px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.progress-container.hidden {
  display: none;
}

.progress-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cancel-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: 8px 12px;
  border: 1px solid #64748b;
  border-radius: 4px;
  background: transparent;
  color: #f1f5f9;
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;
  flex-shrink: 0;
}

.cancel-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
  border-color: #94a3b8;
}

.cancel-btn:focus-visible {
  outline: 2px solid #60a5fa;
  outline-offset: 2px;
}

.cancel-btn.hidden {
  display: none;
}
`;

// ─── Factory Function ─────────────────────────────────────────────

/**
 * Creates a progress indicator inside a Shadow DOM.
 *
 * @param hostElement - The DOM element to attach the shadow root to
 * @param options - Configuration including locale and cancel callback
 * @returns Handle with `update`, `dismiss`, and `destroy` methods
 */
export function createProgressIndicator(
  hostElement: Element,
  options: ProgressIndicatorOptions,
): ProgressIndicatorHandle {
  const { locale, onCancel } = options;

  let autoDismissTimer: ReturnType<typeof setTimeout> | null = null;
  let destroyed = false;

  // Create open Shadow DOM
  const shadowRoot = hostElement.attachShadow({ mode: 'open' });

  // Inject scoped CSS
  const styleEl = document.createElement('style');
  styleEl.textContent = PROGRESS_INDICATOR_CSS;
  shadowRoot.appendChild(styleEl);

  // Container element
  const container = document.createElement('div');
  container.className = 'progress-container';
  container.setAttribute('role', 'status');
  shadowRoot.appendChild(container);

  // Aria-live region for screen reader announcements
  const textEl = document.createElement('span');
  textEl.className = 'progress-text';
  textEl.setAttribute('aria-live', 'polite');
  textEl.setAttribute('aria-atomic', 'true');
  container.appendChild(textEl);

  // Cancel button
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'cancel-btn';
  cancelBtn.setAttribute('type', 'button');
  cancelBtn.textContent = getLocalizedMessage('bulkStarCancel', locale);
  container.appendChild(cancelBtn);

  // ─── Event Handlers ───────────────────────────────────────────

  function handleCancelClick(event: MouseEvent): void {
    event.stopPropagation();
    onCancel();
  }

  function handleContainerClick(): void {
    dismiss();
  }

  cancelBtn.addEventListener('click', handleCancelClick);
  container.addEventListener('click', handleContainerClick);

  // ─── Helper Functions ─────────────────────────────────────────

  function getPhaseText(progress: BulkStarProgress): string {
    switch (progress.phase) {
      case 'loading':
        if (progress.eventsLoaded > 0) {
          return getLocalizedMessage('bulkStarEventsFound', locale, [
            String(progress.eventsLoaded),
          ]);
        }
        return getLocalizedMessage('bulkStarLoading', locale);

      case 'starring':
        return getLocalizedMessage('bulkStarProgress', locale, [
          String(progress.eventsProcessed),
          String(progress.eventsTotal),
        ]);

      case 'complete':
        return getLocalizedMessage('bulkStarComplete', locale, [
          String(progress.eventsNewlyStarred),
          String(progress.eventsAlreadyStarred),
        ]);

      case 'cancelled':
        return getLocalizedMessage('bulkStarCancelled', locale, [
          String(progress.eventsNewlyStarred),
          String(progress.eventsTotal),
        ]);

      case 'error':
        return getLocalizedMessage('bulkStarError', locale);
    }
  }

  function shouldShowCancel(phase: BulkStarProgress['phase']): boolean {
    return phase === 'loading' || phase === 'starring';
  }

  function scheduleAutoDismiss(): void {
    clearAutoDismissTimer();
    autoDismissTimer = setTimeout(() => {
      dismiss();
    }, BULK_STAR_CONSTANTS.SUMMARY_DISPLAY_MS);
  }

  function clearAutoDismissTimer(): void {
    if (autoDismissTimer !== null) {
      clearTimeout(autoDismissTimer);
      autoDismissTimer = null;
    }
  }

  // ─── Public Methods ───────────────────────────────────────────

  function update(progress: BulkStarProgress): void {
    if (destroyed) return;

    // Show the container
    container.classList.remove('hidden');

    // Update text
    textEl.textContent = getPhaseText(progress);

    // Show/hide cancel button based on phase
    if (shouldShowCancel(progress.phase)) {
      cancelBtn.classList.remove('hidden');
    } else {
      cancelBtn.classList.add('hidden');
    }

    // Schedule auto-dismiss for terminal phases
    if (
      progress.phase === 'complete' ||
      progress.phase === 'cancelled' ||
      progress.phase === 'error'
    ) {
      scheduleAutoDismiss();
    }
  }

  function dismiss(): void {
    if (destroyed) return;
    clearAutoDismissTimer();
    container.classList.add('hidden');
  }

  function destroy(): void {
    if (destroyed) return;
    destroyed = true;
    clearAutoDismissTimer();
    cancelBtn.removeEventListener('click', handleCancelClick);
    container.removeEventListener('click', handleContainerClick);
    hostElement.remove();
  }

  return { update, dismiss, destroy };
}
