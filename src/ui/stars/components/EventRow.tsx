/**
 * EventRow component for the Stars Page.
 *
 * Renders a single event row with all six columns:
 * title, organiser, date-time, location, topic, and unstar action.
 *
 * Title is rendered as an <a> element when sourceUrl is present,
 * opening in a new tab with target="_blank" and rel="noopener noreferrer".
 * When sourceUrl is null, title is rendered as plain text.
 *
 * Requirements: 10.3, 10.8
 */

import type { IBrowserApiAdapter, StarredEvent } from '#core/types';

export interface EventRowProps {
  readonly event: StarredEvent;
  readonly onUnstar: (eventId: string) => void;
  readonly adapter: IBrowserApiAdapter;
}

export function EventRow({ event, onUnstar, adapter }: EventRowProps): React.JSX.Element {
  const handleUnstar = (): void => {
    onUnstar(event.id);
  };

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="truncate px-3 py-2 text-sm text-gray-900" title={event.title}>
        {event.sourceUrl !== null ? (
          <a
            href={event.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
          >
            {event.title}
          </a>
        ) : (
          event.title
        )}
      </td>
      <td className="truncate px-3 py-2 text-sm text-gray-600" title={event.organiser ?? ''}>
        {event.organiser ?? ''}
      </td>
      <td className="px-3 py-2 text-sm text-gray-600">
        {event.startDateTime}
      </td>
      <td className="truncate px-3 py-2 text-sm text-gray-600" title={event.location ?? ''}>
        {event.location ?? ''}
      </td>
      <td className="truncate px-3 py-2 text-sm text-gray-600" title={event.topic ?? ''}>
        {event.topic ?? ''}
      </td>
      <td className="px-3 py-2">
        <button
          type="button"
          onClick={handleUnstar}
          className="text-sm text-red-600 hover:text-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-red-600 transition-colors"
        >
          {adapter.getMessage('unstarAction')}
        </button>
      </td>
    </tr>
  );
}
