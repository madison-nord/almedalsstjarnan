/**
 * EventRow component for the Stars Page.
 *
 * Renders a single event row with all seven columns:
 * checkbox, title, organiser, date-time, location, topic, and actions.
 *
 * Title is rendered as an <a> element when sourceUrl is present,
 * opening in a new tab with target="_blank" and rel="noopener noreferrer".
 * When sourceUrl is null, title is rendered as plain text.
 *
 * Provides an expand/collapse toggle to reveal event details (description,
 * topic, and full time range) in a detail row below the main row.
 *
 * Requirements: 10.3, 10.8, 2.3, 3.4
 */

import { useState } from 'react';

import type { IBrowserApiAdapter, StarredEvent } from '#core/types';
import { formatEventDateTime } from '#core/date-formatter';
import { stripSourceUrl } from '#ui/popup/components/EventItem';

export interface EventRowProps {
  readonly event: StarredEvent;
  readonly onUnstar: (eventId: string) => void;
  readonly adapter: IBrowserApiAdapter;
  readonly locale: 'sv' | 'en';
  readonly isSelected?: boolean;
  readonly onToggleSelection?: (eventId: string) => void;
}

export function EventRow({
  event,
  onUnstar,
  adapter,
  locale,
  isSelected,
  onToggleSelection,
}: EventRowProps): React.JSX.Element {
  const [expanded, setExpanded] = useState<boolean>(false);

  const handleUnstar = (): void => {
    onUnstar(event.id);
  };

  const handleToggle = (): void => {
    onToggleSelection?.(event.id);
  };

  const toggleLabel = expanded
    ? adapter.getMessage('collapseEvent')
    : adapter.getMessage('expandEvent');

  const toggleTooltip = expanded
    ? adapter.getMessage('showLess')
    : adapter.getMessage('showMore');

  return (
    <>
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
          {formatEventDateTime(event.startDateTime, event.endDateTime, locale)}
        </td>
        <td className="truncate px-3 py-2 text-sm text-gray-600" title={event.location ?? ''}>
          {event.location ?? ''}
        </td>
        <td className="truncate px-3 py-2 text-sm text-gray-600" title={event.topic ?? ''}>
          {event.topic ?? ''}
        </td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              aria-expanded={expanded}
              aria-label={toggleLabel}
              title={toggleTooltip}
              className="w-8 h-8 flex items-center justify-center rounded text-gray-500 hover:text-gray-800 hover:bg-gray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d={expanded ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'}
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleUnstar}
              aria-label={adapter.getMessage('unstarAction')}
              className="w-8 h-8 flex items-center justify-center text-red-600 hover:text-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-red-600 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-gray-100 bg-gray-50">
          <td colSpan={7} className="px-6 py-3 text-xs text-gray-600 space-y-1">
            <p>
              <span className="font-medium text-gray-700">
                {formatEventDateTime(event.startDateTime, event.endDateTime, locale)}
              </span>
            </p>
            {event.topic !== null && (
              <p>
                <span className="font-medium text-gray-700">{event.topic}</span>
              </p>
            )}
            {event.description !== null && (
              <p className="whitespace-pre-line">
                {stripSourceUrl(event.description, event.sourceUrl)}
              </p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
