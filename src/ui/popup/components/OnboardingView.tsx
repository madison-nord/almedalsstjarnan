/**
 * OnboardingView component.
 *
 * Displays a dismissible introductory section explaining the extension's
 * purpose and basic usage. Shown on first run (when onboardingDismissed
 * is not set in storage). After dismissal, can be re-opened via the
 * "How it works" help link.
 *
 * Requirements: 6.1, 6.2, 6.3
 */

import type { IBrowserApiAdapter } from '#core/types';

export interface OnboardingViewProps {
  readonly adapter: IBrowserApiAdapter;
  readonly onDismiss: () => void;
}

export function OnboardingView({ adapter, onDismiss }: OnboardingViewProps): React.JSX.Element {
  return (
    <section
      className="mx-4 mt-3 mb-2 p-4 bg-blue-50 border border-blue-200 rounded-lg"
      aria-labelledby="onboarding-title"
    >
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
        onClick={onDismiss}
        className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors"
      >
        {adapter.getMessage('onboardingDismiss')}
      </button>
    </section>
  );
}
