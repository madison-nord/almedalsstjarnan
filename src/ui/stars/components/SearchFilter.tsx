/**
 * SearchFilter component for the Stars Page.
 *
 * Renders a text input that filters displayed events by matching
 * against title, organiser, or topic (case-insensitive).
 * Uses i18n for placeholder and accessible label.
 *
 * Requirements: 2.1, 2.2
 */

import type { IBrowserApiAdapter } from '#core/types';

export interface SearchFilterProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly adapter: IBrowserApiAdapter;
}

export function SearchFilter({ value, onChange, adapter }: SearchFilterProps): React.JSX.Element {
  return (
    <div className="relative">
      <label htmlFor="stars-filter" className="sr-only">
        {adapter.getMessage('filterLabel')}
      </label>
      <input
        id="stars-filter"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={adapter.getMessage('filterPlaceholder')}
        aria-label={adapter.getMessage('filterLabel')}
        className="w-64 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
}
