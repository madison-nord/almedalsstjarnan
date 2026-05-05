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
 * Displays a subtle conflict indicator (left border accent + dot) when
 * the event overlaps with other starred events.
 *
 * Requirements: 10.3, 10.8, 8.1, 8.2, 8.5
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

export function EventRow({ event, onUnstar, adapter, isConflicting, conflictTitles, isSelected, onToggleSelection }: EventRowProps): React.JSX.Element {
  const handleUnstar = (): void => {
    onUnstar(event.id);
  };

  const handleToggle = (): void => {
    onToggleSelection?.(event.id);
  };

  const tooltipText = conflictTitles && conflictTitles.length > 0
    ? conflictTitles.join(', ')
    : '';

  const rowClasses = isConflicting === true
    ? 'border-b border-gray-100 even:bg-brand-surface odd:bg-white hover:bg-amber-100'
    : 'border-b border-gray-100 even:bg-brand-surface odd:bg-white hover:bg-amber-100';

  return (
    <tr className={rowClasses}>
      <td className="px-3 py-2 w-10">
        <input
          type="checkbox"
          checked={isSelected ?? false}
          onChange={handleToggle}
          aria-label={`${adapter.getMessage('selectAll')}: ${event.title}`}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
        />
      </td>
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
      <td className={`px-3 py-2 text-sm text-gray-600${isConflicting === true ? ' border-l-2 border-l-slate-300' : ''}`}>
        <span className="flex items-center gap-1">
          {formatEventDateTime(event.startDateTime, event.endDateTime, 'sv')}
          {isConflicting === true && (
            <span
              className="text-slate-400"
              title={tooltipText}
              aria-label={tooltipText}
              role="img"
            >
              ●
            </span>
          )}
        </span>
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
