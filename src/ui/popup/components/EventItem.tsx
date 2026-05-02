/**
 * EventItem component for the Popup UI.
 *
 * Renders a single starred event with title, organiser, date-time, and location.
 * All event content comes from the host page and is NOT localized.
 *
 * Requirements: 9.4
 */

import type { StarredEvent } from '#core/types';

export interface EventItemProps {
  readonly event: StarredEvent;
}

export function EventItem({ event }: EventItemProps): React.JSX.Element {
  return (
    <li className="border-b border-gray-100 px-3 py-2 last:border-b-0">
      <p className="text-sm font-medium text-gray-900 truncate">{event.title}</p>
      {event.organiser && (
        <p className="text-xs text-gray-600 truncate">{event.organiser}</p>
      )}
      <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
        <span>{event.startDateTime}</span>
        {event.location && (
          <>
            <span aria-hidden="true">·</span>
            <span className="truncate">{event.location}</span>
          </>
        )}
      </div>
    </li>
  );
}
