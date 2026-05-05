/**
 * SectionHeader component for the Stars Page.
 *
 * Renders a date group header row spanning all columns in the event grid.
 * Displays the date in a locale-appropriate format (e.g., "Måndag 22 juni"
 * in Swedish, "Monday 22 June" in English).
 *
 * Requirements: 2.3
 */

export interface SectionHeaderProps {
  readonly label: string;
  readonly columnCount: number;
}

export function SectionHeader({ label, columnCount }: SectionHeaderProps): React.JSX.Element {
  return (
    <tr className="bg-gray-50" role="row">
      <th
        colSpan={columnCount}
        scope="colgroup"
        className="px-3 py-2 text-left text-sm font-semibold text-gray-800"
      >
        {label}
      </th>
    </tr>
  );
}
