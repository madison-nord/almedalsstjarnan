/**
 * OnboardingView component.
 *
 * Displays a dismissible introductory section explaining the extension's
 * purpose and basic usage as a modal overlay. Shown on first run (when
 * onboardingDismissed is not set in storage). After dismissal, can be
 * re-opened via the "How it works" help link.
 *
 * Implements focus trapping: on mount, focus moves to the first focusable
 * element. Tab/Shift+Tab cycle within the modal. Escape dismisses.
 * On dismiss, focus returns to the trigger element if provided.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 6.1, 6.2, 6.3
 */

import { useEffect, useRef, useCallback } from 'react';

import type { IBrowserApiAdapter } from '#core/types';

export interface OnboardingViewProps {
  readonly adapter: IBrowserApiAdapter;
  readonly onDismiss: () => void;
  readonly triggerRef?: React.RefObject<HTMLElement | null>;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function OnboardingView({ adapter, onDismiss, triggerRef }: OnboardingViewProps): React.JSX.Element {
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleDismiss = useCallback((): void => {
    onDismiss();
    if (triggerRef?.current) {
      triggerRef.current.focus();
    }
  }, [onDismiss, triggerRef]);

  // Focus trapping
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    const focusableElements = overlay.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    if (focusableElements.length > 0) {
      const first = focusableElements[0];
      if (first) first.focus();
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (!overlay) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        handleDismiss();
        return;
      }

      if (event.key === 'Tab') {
        const currentFocusable = overlay.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (currentFocusable.length === 0) return;

        const firstElement = currentFocusable[0];
        const lastElement = currentFocusable[currentFocusable.length - 1];
        if (!firstElement || !lastElement) return;

        if (event.shiftKey) {
          // Shift+Tab: if on first element, wrap to last
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab: if on last element, wrap to first
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    }

    overlay.addEventListener('keydown', handleKeyDown);

    return () => {
      overlay.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleDismiss]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <section className="mx-4 p-4 bg-blue-50 border border-blue-200 rounded-lg max-h-[90%] overflow-y-auto">
        <h2
          id="onboarding-title"
          className="text-base font-semibold text-blue-900 mb-3"
        >
          {adapter.getMessage('onboardingTitle')}
        </h2>

        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 mb-4">
          <li>
            <a
              href="https://almedalsveckan.info/rg/almedalsveckan/officiellt-program/program-2026"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              {adapter.getMessage('onboardingStep1')}
            </a>
          </li>
          <li>{adapter.getMessage('onboardingStep2')}</li>
          <li>{adapter.getMessage('onboardingStep3')}</li>
          <li>{adapter.getMessage('onboardingStep4')}</li>
        </ol>

        <button
          type="button"
          onClick={handleDismiss}
          className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors"
        >
          {adapter.getMessage('onboardingDismiss')}
        </button>
      </section>
    </div>
  );
}
