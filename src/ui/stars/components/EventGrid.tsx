/**
 * EventGrid component for the Stars Page.
 *
 * Renders a 6-column grid (table) with a header row using localized
 * column labels and one EventRow per starred event.
 * Groups events by date and renders a SectionHeader before each group.
 * Passes conflict information to each EventRow.
 *
 * Requirements: 10.3, 2.3, 2.4, 8.2
 */

import { Fragment } from 'react';

import type { IBrowserApiAdapter, StarredEvent } from '#core/types';

import { EventRow } from './EventRow';
import { SectionHeader } from './SectionHeader';

export interface EventGridProps {
  readonly events: readonly StarredEvent[];
  readonly onUnstar: (eventId: string) => void;
  readonly adapter: IBrowserApiAdapter;
  readonly conflictingIds?: ReadonlySet<string>;
  readonly conflictTitlesMap?: ReadonlyMap<string, readonly string[]>;
  readonly selectedIds?: ReadonlySet<string>;
  readonly onToggleSelection?: (eventId: string) => void;
  readonly onSelectAll?: () => void;
  readonly allSelected?: boolean;
}

/** Number of columns in the event grid table. */
const COLUMN_COUNT = 7;

/**
 * Extracts the date portion (YYYY-MM-DD) from an ISO 8601 date-time string.
 */
function extractDateKey(isoString: string): string {
  const tIndex = isoString.indexOf('T');
  if (tIndex === -1) return isoString;
  return isoString.slice(0, tIndex);
}

/**
 * Formats a date key (YYYY-MM-DD) into a locale-appropriate section header label.
 * Swedish: "Måndag 22 juni"
 * English: "Monday 22 June"
 */
function formatSectionDate(dateKey: string): string {
  const parts = dateKey.split('-');
  if (parts.length !== 3) return dateKey;

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return dateKey;

  // Tomohiko Sakamoto's algorithm (returns 0=Sunday, 1=Monday, ..., 6=Saturday)
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4] as const;
  let y = year;
  if (month < 3) y -= 1;
  const dow = (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + (t[month - 1] ?? 0) + day) % 7;
  // Convert from 0=Sunday to 0=Monday (our index)
  const mondayIndex = (dow + 6) % 7;

  const svDays = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'] as const;
  const svMonths = [
    'januari', 'februari', 'mars', 'april', 'maj', 'juni',
    'juli', 'augusti', 'september', 'oktober', 'november', 'december',
  ] as const;

  const dayName = svDays[mondayIndex] ?? '';
  const monthName = svMonths[month - 1] ?? '';

  return `${dayName} ${day} ${monthName}`;
}

export interface DateGroup {
  readonly dateKey: string;
  readonly label: string;
  readonly events: readonly StarredEvent[];
}

/**
 * Groups events by date (YYYY-MM-DD extracted from startDateTime).
 * Preserves the input order within each group.
 * Groups are ordered by their first appearance in the input array.
 */
export function groupEventsByDate(events: readonly StarredEvent[]): readonly DateGroup[] {
  const groupMap = new Map<string, StarredEvent[]>();
  const groupOrder: string[] = [];

  for (const event of events) {
    const dateKey = extractDateKey(event.startDateTime);
    if (!groupMap.has(dateKey)) {
      groupMap.set(dateKey, []);
      groupOrder.push(dateKey);
    }
    const group = groupMap.get(dateKey);
    if (group) group.push(event);
  }

  return groupOrder.map((dateKey) => ({
    dateKey,
    label: formatSectionDate(dateKey),
    events: groupMap.get(dateKey) ?? [],
  }));
}

export function EventGrid({ events, onUnstar, adapter, conflictingIds, conflictTitlesMap, selectedIds, onToggleSelection, onSelectAll, allSelected }: EventGridProps): React.JSX.Element {
  const groups = groupEventsByDate(events);

  return (
    <table className="w-full border-collapse table-fixed">
      <thead>
        <tr className="border-b-2 border-brand-secondary text-left">
          <th className="w-10 px-3 py-2">
            <input
              type="checkbox"
              checked={allSelected ?? false}
              onChange={onSelectAll}
              aria-label={adapter.getMessage('selectAll')}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
            />
          </th>
          <th className="w-1/4 px-3 py-2 text-sm font-semibold text-brand-secondary">
            {adapter.getMessage('columnTitle')}
          </th>
          <th className="w-1/5 px-3 py-2 text-sm font-semibold text-brand-secondary">
            {adapter.getMessage('columnOrganiser')}
          </th>
          <th className="w-1/5 px-3 py-2 text-sm font-semibold text-brand-secondary">
            {adapter.getMessage('columnDateTime')}
          </th>
          <th className="w-[15%] px-3 py-2 text-sm font-semibold text-brand-secondary">
            {adapter.getMessage('columnLocation')}
          </th>
          <th className="w-[10%] px-3 py-2 text-sm font-semibold text-brand-secondary">
            {adapter.getMessage('columnTopic')}
          </th>
          <th className="w-[10%] px-3 py-2 text-sm font-semibold text-brand-secondary">
            <span className="sr-only">{adapter.getMessage('columnActions')}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {groups.map((group) => (
          <Fragment key={group.dateKey}>
            <SectionHeader label={group.label} columnCount={COLUMN_COUNT} />
            {group.events.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                onUnstar={onUnstar}
                adapter={adapter}
                isConflicting={conflictingIds?.has(event.id)}
                conflictTitles={conflictTitlesMap?.get(event.id)}
                isSelected={selectedIds?.has(event.id)}
                onToggleSelection={onToggleSelection}
              />
            ))}
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}
