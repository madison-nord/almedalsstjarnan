/**
 * Feature groups data for the HelpModal component.
 *
 * Defines the 9 feature groups displayed in the help overlay,
 * each with i18n keys for heading/description and a decorative SVG icon.
 *
 * Requirements: 1.2, 1.3, 8.1, 8.2, 8.3
 */

import React from 'react';

export interface HelpFeatureGroup {
  /** i18n message key for the group heading */
  readonly headingKey: string;
  /** i18n message key for the group description */
  readonly descriptionKey: string;
  /** React component that renders the inline SVG icon (decorative) */
  readonly Icon: () => React.JSX.Element;
}

function StarIcon(): React.JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function PopupViewIcon(): React.JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm0 2v12h16V6H4zm2 2h12v2H6V8zm0 4h8v2H6v-2z" />
    </svg>
  );
}

function StarsPageIcon(): React.JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M3 3h7v7H3V3zm0 11h7v7H3v-7zm11-11h7v7h-7V3zm0 11h7v7h-7v-7zM5 5v3h3V5H5zm0 11v3h3v-3H5zm11-11v3h3V5h-3zm0 11v3h3v-3h-3z" />
    </svg>
  );
}

function SortingIcon(): React.JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z" />
    </svg>
  );
}

function ConflictIcon(): React.JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
    </svg>
  );
}

function SearchFilterIcon(): React.JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
    </svg>
  );
}

function BulkActionsIcon(): React.JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
    </svg>
  );
}

function IcsExportIcon(): React.JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zM7 12h5v5H7v-5z" />
    </svg>
  );
}

function LanguageToggleIcon(): React.JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z" />
    </svg>
  );
}

export const HELP_FEATURE_GROUPS: readonly HelpFeatureGroup[] = [
  {
    headingKey: 'helpGroupStarEventsHeading',
    descriptionKey: 'helpGroupStarEventsDesc',
    Icon: StarIcon,
  },
  {
    headingKey: 'helpGroupPopupViewHeading',
    descriptionKey: 'helpGroupPopupViewDesc',
    Icon: PopupViewIcon,
  },
  {
    headingKey: 'helpGroupStarsPageHeading',
    descriptionKey: 'helpGroupStarsPageDesc',
    Icon: StarsPageIcon,
  },
  {
    headingKey: 'helpGroupSortingHeading',
    descriptionKey: 'helpGroupSortingDesc',
    Icon: SortingIcon,
  },
  {
    headingKey: 'helpGroupConflictHeading',
    descriptionKey: 'helpGroupConflictDesc',
    Icon: ConflictIcon,
  },
  {
    headingKey: 'helpGroupSearchFilterHeading',
    descriptionKey: 'helpGroupSearchFilterDesc',
    Icon: SearchFilterIcon,
  },
  {
    headingKey: 'helpGroupBulkActionsHeading',
    descriptionKey: 'helpGroupBulkActionsDesc',
    Icon: BulkActionsIcon,
  },
  {
    headingKey: 'helpGroupIcsExportHeading',
    descriptionKey: 'helpGroupIcsExportDesc',
    Icon: IcsExportIcon,
  },
  {
    headingKey: 'helpGroupLanguageHeading',
    descriptionKey: 'helpGroupLanguageDesc',
    Icon: LanguageToggleIcon,
  },
] as const;
