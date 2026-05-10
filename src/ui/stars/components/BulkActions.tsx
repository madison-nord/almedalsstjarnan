/**
 * BulkActions component for the Stars Page.
 *
 * Renders a floating action bar when one or more events are selected,
 * providing batch unstar and export controls. Also provides a select-all
 * checkbox for the grid header.
 *
 * Requirements: 2.5, 2.6
 */

import type { IBrowserApiAdapter } from '#core/types';

export interface BulkActionsProps {
  readonly selectedCount: number;
  readonly totalCount: number;
  readonly onSelectAll: () => void;
  readonly onClearSelection: () => void;
  readonly onUnstarSelected: () => void;
  readonly onExportSelected: () => void;
  readonly allSelected: boolean;
  readonly adapter: IBrowserApiAdapter;
}

export function BulkActions({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onUnstarSelected,
  onExportSelected,
  allSelected,
  adapter,
}: BulkActionsProps): React.JSX.Element {
  const isDisabled = selectedCount === 0;

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-lg bg-gray-900 px-4 py-3 text-white shadow-lg"
      role="toolbar"
      aria-label={adapter.getMessage('selectAll')}
    >
      <span className="text-sm font-medium">
        {selectedCount} / {totalCount}
      </span>

      <button
        type="button"
        onClick={allSelected ? onClearSelection : onSelectAll}
        className="text-sm underline hover:text-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white"
      >
        {allSelected
          ? '✕'
          : adapter.getMessage('selectAll')}
      </button>

      <button
        type="button"
        onClick={onUnstarSelected}
        disabled={isDisabled}
        className={`rounded bg-red-600 px-3 py-1.5 text-sm font-medium hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white transition-colors${isDisabled ? ' opacity-50 cursor-not-allowed' : ''}`}
      >
        {adapter.getMessage('unstarSelected')}
      </button>

      <button
        type="button"
        onClick={onExportSelected}
        disabled={isDisabled}
        className={`rounded bg-blue-600 px-3 py-1.5 text-sm font-medium hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white transition-colors${isDisabled ? ' opacity-50 cursor-not-allowed' : ''}`}
      >
        {adapter.getMessage('exportSelected')}
      </button>
    </div>
  );
}
