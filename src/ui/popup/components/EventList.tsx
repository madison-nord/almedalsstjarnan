/**
 * EventList component for the Popup UI.
 *
 * Renders a list of starred events, capped at 20 items.
 *
 * Requirements: 9.3
 */

import type { StarredEvent } from '#core/types';

import { EventItem } from './EventItem';

const MAX_POPUP_EVENTS = 20;

export interface EventListProps {
  readonly events: readonly StarredEvent[];
}

export function EventList({ events }: EventListProps): React.JSX.Element {
  const displayedEvents = events.slice(0, MAX_POPUP_EVENTS);

  return (
    <ul className="overflow-y-auto flex-1" role="list">
      {displayedEvents.map((event) => (
        <EventItem key={event.id} event={event} />
      ))}
    </ul>
  );
}
