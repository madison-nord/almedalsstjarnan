/**
 * Shared SortSelector component.
 *
 * Renders a native HTML <select> element with four sort order options.
 * All labels are localized via the adapter's getMessage method.
 * Includes a visible label before the dropdown.
 * Used by both Popup UI and Stars Page.
 *
 * Requirements: 9.5, 10.4, 14.8
 */

import type { IBrowserApiAdapter, SortOrder } from '#core/types';
import { SORT_ORDERS } from '#core/types';

export interface SortSelectorProps {
  readonly currentOrder: SortOrder;
  readonly onOrderChange: (order: SortOrder) => void;
  readonly adapter: IBrowserApiAdapter;
  readonly labelClassName?: string;
}

const SORT_ORDER_I18N_KEYS: Record<SortOrder, string> = {
  chronological: 'sortChronological',
  'reverse-chronological': 'sortReverseChronological',
  'alphabetical-by-title': 'sortAlphabeticalTitle',
  'starred-desc': 'sortStarredDesc',
} as const;

export function SortSelector({
  currentOrder,
  onOrderChange,
  adapter,
  labelClassName = 'text-gray-600',
}: SortSelectorProps): React.JSX.Element {
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    onOrderChange(event.target.value as SortOrder);
  };

  return (
    <div className="flex items-center gap-1.5">
      <label htmlFor="sort-selector" className={`text-xs font-medium ${labelClassName}`}>
        {adapter.getMessage('sortVisibleLabel')}
      </label>
      <select
        id="sort-selector"
        value={currentOrder}
        onChange={handleChange}
        aria-label={adapter.getMessage('sortLabel')}
        className="text-sm border border-gray-300 rounded px-2 py-1 bg-white text-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        {SORT_ORDERS.map((order) => (
          <option key={order} value={order}>
            {adapter.getMessage(SORT_ORDER_I18N_KEYS[order])}
          </option>
        ))}
      </select>
    </div>
  );
}
