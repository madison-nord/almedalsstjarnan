/**
 * EmptyState component for the Popup UI.
 *
 * Renders a localized empty state message when no events are starred.
 * Uses adapter.getMessage for all user-facing strings.
 *
 * Requirements: 9.9
 */

import type { IBrowserApiAdapter } from '#core/types';

export interface EmptyStateProps {
  readonly adapter: IBrowserApiAdapter;
}

export function EmptyState({ adapter }: EmptyStateProps): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 py-8 text-center">
      <h2 className="text-base font-medium text-gray-700 mb-2">
        {adapter.getMessage('emptyStateTitle')}
      </h2>
      <p className="text-sm text-gray-500">
        {adapter.getMessage('emptyStateMessage')}
      </p>
    </div>
  );
}
