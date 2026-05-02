/**
 * Shared SortSelector component.
 *
 * Renders a native HTML <select> element with four sort order options.
 * All labels are localized via the adapter's getMessage method.
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
}: SortSelectorProps): React.JSX.Element {
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    onOrderChange(event.target.value as SortOrder);
  };

  return (
    <select
      value={currentOrder}
      onChange={handleChange}
      aria-label={adapter.getMessage('sortLabel')}
    >
      {SORT_ORDERS.map((order) => (
        <option key={order} value={order}>
          {adapter.getMessage(SORT_ORDER_I18N_KEYS[order])}
        </option>
      ))}
    </select>
  );
}
