import type { StarredEvent, SortOrder } from './types';

/**
 * Returns a new array of events sorted by the specified order.
 * Does NOT mutate the input array.
 *
 * Sort orders:
 * - chronological: startDateTime ascending, tiebreaker: id ascending
 * - reverse-chronological: startDateTime descending, tiebreaker: id ascending
 * - alphabetical-by-title: title ascending (locale-aware), tiebreaker: id ascending
 * - starred-desc: starredAt descending, tiebreaker: startDateTime ascending
 *
 * @param events - Array of starred events
 * @param order - One of the four SortOrder values
 * @returns New sorted array
 */
export function sortEvents(
  events: readonly StarredEvent[],
  order: SortOrder,
): StarredEvent[] {
  const copy = [...events];

  switch (order) {
    case 'chronological':
      return copy.sort((a, b) => {
        const cmp = a.startDateTime.localeCompare(b.startDateTime);
        if (cmp !== 0) return cmp;
        return a.id.localeCompare(b.id);
      });

    case 'reverse-chronological':
      return copy.sort((a, b) => {
        const cmp = b.startDateTime.localeCompare(a.startDateTime);
        if (cmp !== 0) return cmp;
        return a.id.localeCompare(b.id);
      });

    case 'alphabetical-by-title':
      return copy.sort((a, b) => {
        const cmp = a.title.localeCompare(b.title, 'sv');
        if (cmp !== 0) return cmp;
        return a.id.localeCompare(b.id);
      });

    case 'starred-desc':
      return copy.sort((a, b) => {
        const cmp = b.starredAt.localeCompare(a.starredAt);
        if (cmp !== 0) return cmp;
        return a.startDateTime.localeCompare(b.startDateTime);
      });
  }
}
