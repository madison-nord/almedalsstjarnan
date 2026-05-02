/**
 * EventGrid component for the Stars Page.
 *
 * Renders a 6-column grid (table) with a header row using localized
 * column labels and one EventRow per starred event.
 *
 * Requirements: 10.3
 */

import type { IBrowserApiAdapter, StarredEvent } from '#core/types';

import { EventRow } from './EventRow';

export interface EventGridProps {
  readonly events: readonly StarredEvent[];
  readonly onUnstar: (eventId: string) => void;
  readonly adapter: IBrowserApiAdapter;
}

export function EventGrid({ events, onUnstar, adapter }: EventGridProps): React.JSX.Element {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b-2 border-gray-200 text-left">
          <th className="px-3 py-2 text-sm font-semibold text-gray-700">
            {adapter.getMessage('columnTitle')}
          </th>
          <th className="px-3 py-2 text-sm font-semibold text-gray-700">
            {adapter.getMessage('columnOrganiser')}
          </th>
          <th className="px-3 py-2 text-sm font-semibold text-gray-700">
            {adapter.getMessage('columnDateTime')}
          </th>
          <th className="px-3 py-2 text-sm font-semibold text-gray-700">
            {adapter.getMessage('columnLocation')}
          </th>
          <th className="px-3 py-2 text-sm font-semibold text-gray-700">
            {adapter.getMessage('columnTopic')}
          </th>
          <th className="px-3 py-2 text-sm font-semibold text-gray-700">
            {adapter.getMessage('columnActions')}
          </th>
        </tr>
      </thead>
      <tbody>
        {events.map((event) => (
          <EventRow
            key={event.id}
            event={event}
            onUnstar={onUnstar}
            adapter={adapter}
          />
        ))}
      </tbody>
    </table>
  );
}
