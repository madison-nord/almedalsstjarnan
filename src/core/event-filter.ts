/**
 * Pure text filter utility for starred events.
 *
 * Filters events by checking if the title, organiser, or topic
 * contains the filter string (case-insensitive).
 *
 * Used in both the popup (for count) and the stars page (for search filter).
 *
 * Requirements: 2.1, 2.2
 */

import type { StarredEvent } from './types';

/**
 * Filters an array of starred events by a text query.
 *
 * For any non-empty filter string, returns only events where the title,
 * organiser, or topic contains the filter string (case-insensitive).
 * If the filter string is empty, returns all events unchanged.
 *
 * @param events - Array of starred events to filter
 * @param filter - Text string to match against title, organiser, and topic
 * @returns Filtered array of events matching the filter
 */
export function filterEvents(
  events: readonly StarredEvent[],
  filter: string,
): readonly StarredEvent[] {
  if (filter === '') {
    return events;
  }

  const lowerFilter = filter.toLowerCase();

  return events.filter((event) => {
    const title = event.title.toLowerCase();
    const organiser = (event.organiser ?? '').toLowerCase();
    const topic = (event.topic ?? '').toLowerCase();

    return (
      title.includes(lowerFilter) ||
      organiser.includes(lowerFilter) ||
      topic.includes(lowerFilter)
    );
  });
}
