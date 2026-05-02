/**
 * ExportButton component for the Stars Page.
 *
 * Renders an export button that triggers ICS generation and download.
 * Uses adapter.getMessage for the localized button label.
 *
 * Requirements: 10.6, 10.7
 */

import type { IBrowserApiAdapter } from '#core/types';

export interface ExportButtonProps {
  readonly onExport: () => void;
  readonly adapter: IBrowserApiAdapter;
}

export function ExportButton({ onExport, adapter }: ExportButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onExport}
      className="py-2 px-4 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors"
    >
      {adapter.getMessage('exportToCalendar')}
    </button>
  );
}
