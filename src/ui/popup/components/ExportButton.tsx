/**
 * ExportButton component for the Popup UI.
 *
 * Renders an export button that triggers ICS generation and download.
 * Uses adapter.getMessage for the localized button label.
 *
 * Requirements: 1.1
 */

import type { IBrowserApiAdapter } from '#core/types';

export interface ExportButtonProps {
  readonly onExport: () => void;
  readonly adapter: IBrowserApiAdapter;
  readonly disabled?: boolean;
}

export function ExportButton({ onExport, adapter, disabled }: ExportButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onExport}
      disabled={disabled}
      className="w-full py-2 px-4 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {adapter.getMessage('exportToCalendar')}
    </button>
  );
}
