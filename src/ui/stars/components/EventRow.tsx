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
import { formatEventDateTime } from '#core/date-formatter';

export interface EventRowProps {
  readonly event: StarredEvent;
  readonly onUnstar: (eventId: string) => void;
  readonly adapter: IBrowserApiAdapter;
  readonly isConflicting?: boolean;
  readonly conflictTitles?: readonly string[];
  readonly isSelected?: boolean;
  readonly onToggleSelection?: (eventId: string) => void;
}

export function EventRow({ event, onUnstar, adapter, isSelected, onToggleSelection }: EventRowProps): React.JSX.Element {
  const handleUnstar = (): void => {
    onUnstar(event.id);
  };

  const handleToggle = (): void => {
    onToggleSelection?.(event.id);
  };

  return (
    <tr className="border-b border-gray-100 even:bg-brand-surface odd:bg-white hover:bg-amber-100">
      <td className="px-3 py-2 w-10">
        <input
          type="checkbox"
          checked={isSelected ?? false}
          onChange={handleToggle}
          aria-label={`${adapter.getMessage('selectAll')}: ${event.title}`}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
        />
      </td>
      <td className="px-3 py-2 text-sm text-gray-900 break-words" title={event.title}>
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
      <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-600">
        {formatEventDateTime(event.startDateTime, event.endDateTime, 'sv')}
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
          aria-label={adapter.getMessage('unstarAction')}
          className="w-8 h-8 flex items-center justify-center text-red-600 hover:text-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-red-600 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </td>
    </tr>
  );
}
