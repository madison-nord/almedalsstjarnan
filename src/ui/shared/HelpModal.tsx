/**
 * HelpModal component.
 *
 * Displays a dismissible modal overlay showing all extension feature groups
 * in a single scrollable view. Each feature group includes an inline SVG icon,
 * a heading, and a description — all retrieved via i18n message keys.
 *
 * Supports two layout modes:
 * - `popup`: single-column, constrained to fit within 360×600px popup with 8px margin
 * - `page`: centered, max-width 640px, two-column grid at md breakpoint
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.5, 5.6, 6.5, 8.1, 8.4, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */

import { useRef, useEffect, useCallback } from 'react';

import type { IBrowserApiAdapter } from '#core/types';

import { HELP_FEATURE_GROUPS } from './help-feature-groups';

export interface HelpModalProps {
  readonly adapter: IBrowserApiAdapter;
  readonly onDismiss: () => void;
  readonly triggerRef?: React.RefObject<HTMLElement | null>;
  readonly layoutMode: 'popup' | 'page';
}

const HELP_MODAL_TITLE_ID = 'help-modal-title';

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function HelpModal({
  adapter,
  onDismiss,
  triggerRef,
  layoutMode,
}: HelpModalProps): React.JSX.Element {
  const dismissButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const handleDismiss = useCallback((): void => {
    onDismiss();
    if (triggerRef?.current) {
      triggerRef.current.focus();
    }
  }, [onDismiss, triggerRef]);

  // Focus dismiss button on mount
  useEffect(() => {
    if (dismissButtonRef.current) {
      dismissButtonRef.current.focus();
    }
  }, []);

  // Focus trapping and keyboard interaction
  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    function handleKeyDown(event: KeyboardEvent): void {
      if (!modal) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        handleDismiss();
        return;
      }

      if (event.key === 'Tab') {
        const focusableElements = modal.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        if (!firstElement || !lastElement) return;

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    }

    modal.addEventListener('keydown', handleKeyDown);

    return () => {
      modal.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleDismiss]);

  const isPopup = layoutMode === 'popup';

  const containerClasses = isPopup
    ? 'mx-2 my-2 max-w-[344px] max-h-[584px] w-full'
    : 'max-w-[640px] w-full max-h-[90vh]';

  const gridClasses = isPopup ? 'grid grid-cols-1 gap-4' : 'grid grid-cols-1 md:grid-cols-2 gap-4';

  return (
    <div ref={modalRef} className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={handleDismiss} />

      {/* Modal content */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={HELP_MODAL_TITLE_ID}
        className={`relative bg-white rounded-lg shadow-lg p-5 overflow-y-auto ${containerClasses}`}
      >
        {/* Header with title and dismiss button */}
        <div className="flex items-start justify-between mb-4">
          <h2 id={HELP_MODAL_TITLE_ID} className="text-lg font-semibold text-gray-900">
            {adapter.getMessage('helpModalTitle')}
          </h2>

          <button
            ref={dismissButtonRef}
            type="button"
            onClick={handleDismiss}
            aria-label={adapter.getMessage('helpModalDismiss')}
            className="ml-2 p-1 text-gray-500 hover:text-gray-700 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
            </svg>
          </button>
        </div>

        {/* Feature groups grid */}
        <div className={gridClasses}>
          {HELP_FEATURE_GROUPS.map((group) => (
            <div key={group.headingKey} className="flex gap-3 items-start">
              <div className="flex-shrink-0 text-gray-700">
                <group.Icon />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900">
                  {adapter.getMessage(group.headingKey)}
                </h3>
                <p className="text-sm text-gray-600 mt-0.5">
                  {adapter.getMessage(group.descriptionKey)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
