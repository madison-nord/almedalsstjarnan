/**
 * EventItem component for the Popup UI.
 *
 * Renders a single starred event with title, organiser, date-time, and location.
 * Displays a filled star toggle button that triggers the undo flow on click.
 * Renders the title as a clickable link when sourceUrl is non-null.
 * Provides an expand/collapse toggle revealing description, topic, and full time range.
 * Displays a subtle conflict indicator (muted dot) when the event overlaps
 * with other starred events.
 * All event content comes from the host page and is NOT localized.
 *
 * Requirements: 9.4, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 8.1, 8.2, 8.5
 */

import { useState } from 'react';

import type { IBrowserApiAdapter, StarredEvent } from '#core/types';
import { formatEventDateTime } from '#core/date-formatter';

/**
 * Escapes special regex characters in a string so it can be used safely in a RegExp.
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Strips the sourceUrl from a description string to avoid redundant display.
 * Handles the Swedish "Länk till evenemanget:" label pattern as well as bare URLs.
 * Returns the description unchanged if sourceUrl is null or not found.
 */
export function stripSourceUrl(description: string, sourceUrl: string | null): string {
  if (!sourceUrl || !description) return description;
  if (!description.includes(sourceUrl)) return description;

  // Step 1: Try to remove the full label+URL pattern (with optional preceding newline)
  const escapedSourceUrl = escapeRegExp(sourceUrl);
  const labelPattern = new RegExp(`\\n?Länk till evenemanget:\\s*${escapedSourceUrl}`);
  let result = description.replace(labelPattern, '');

  // Step 2: Fallback — if sourceUrl is still present, remove the bare URL
  if (result.includes(sourceUrl)) {
    result = result.replace(sourceUrl, '');
  }

  return result.trim();
}

export interface EventItemProps {
  readonly event: StarredEvent;
  readonly onUnstar: (eventId: string) => void;
  readonly adapter: IBrowserApiAdapter;
  readonly isConflicting?: boolean;
  readonly conflictTitles?: readonly string[];
}

export function EventItem({ event, onUnstar, adapter, isConflicting, conflictTitles }: EventItemProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);

  const tooltipText = conflictTitles && conflictTitles.length > 0
    ? conflictTitles.join(', ')
    : '';

  const titleElement = event.sourceUrl != null ? (
    <a
      href={event.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm font-semibold text-brand-secondary hover:underline break-words"
    >
      {event.title}
    </a>
  ) : (
    <p className="text-sm font-semibold text-brand-secondary break-words">{event.title}</p>
  );

  const toggleLabel = expanded
    ? adapter.getMessage('collapseEvent')
    : adapter.getMessage('expandEvent');

  const toggleTooltip = expanded
    ? adapter.getMessage('showLess')
    : adapter.getMessage('showMore');

  return (
    <li className="bg-brand-surface rounded-lg shadow-sm p-3 flex items-start gap-2">
      <button
        type="button"
        onClick={() => onUnstar(event.id)}
        aria-label={adapter.getMessage('unstarEvent')}
        className="flex-shrink-0 mt-0.5 text-brand-accent hover:text-amber-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        ★
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-1">
          <div className="min-w-0 flex-1">
            {titleElement}
          </div>
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
            aria-label={toggleLabel}
            title={toggleTooltip}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded text-gray-500 hover:text-gray-800 hover:bg-gray-200 text-base leading-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d={expanded ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        {event.organiser && (
          <p className="text-xs text-gray-600 line-clamp-2">{event.organiser}</p>
        )}
        <div className="text-xs text-gray-500 mt-0.5">
          <span>{formatEventDateTime(event.startDateTime, event.endDateTime, 'sv')}</span>
          {isConflicting === true && (
            <span
              className="ml-2 text-slate-400"
              title={tooltipText}
              aria-label={tooltipText}
              role="img"
            >
              ●
            </span>
          )}
          {event.location && (
            <>
              <span className="mx-1" aria-hidden="true">·</span>
              <span>{event.location}</span>
            </>
          )}
        </div>
        {expanded && (
          <div className="mt-1.5 text-xs text-gray-600 space-y-0.5">
            {event.startDateTime && event.endDateTime && (
              <p>
                <span className="font-medium text-gray-700">
                  {formatEventDateTime(event.startDateTime, event.endDateTime, 'sv')}
                </span>
              </p>
            )}
            {event.topic && (
              <p>
                <span className="font-medium text-gray-700">{event.topic}</span>
              </p>
            )}
            {event.description && (
              <p className="whitespace-pre-line">{stripSourceUrl(event.description, event.sourceUrl)}</p>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
