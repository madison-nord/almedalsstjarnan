# Technical Design

## Overview

This design document describes how to fix all 16 code review issues for the Almedalsstjärnan browser extension. Changes include license metadata correction, star button accessibility fix, locale prop threading, hook deduplication, and project hygiene improvements.

## Architecture

This spec makes targeted changes across the existing architecture without introducing new modules or changing the message-passing pattern. The changes fall into three categories:

1. **Metadata fixes** — package.json, README, LICENSE consistency, CI config, steering files
2. **UI component fixes** — locale threading, prop cleanup, hook deduplication
3. **Project hygiene** — formatting, gitkeep cleanup, CONTRIBUTING.md

No new services, APIs, or storage schemas are introduced.

## Components and Interfaces

### useLocalizedAdapter Hook (New)

**Location:** `src/ui/shared/hooks/useLocalizedAdapter.ts`

```typescript
export function useLocalizedAdapter(
  adapter: IBrowserApiAdapter,
  locale: 'sv' | 'en' | null,
): IBrowserApiAdapter;
```

Returns a memoized adapter where `getMessage` is overridden to use `getLocalizedMessage` when locale is set. Falls back to the original adapter when locale is null.

### EventItem Props (Modified)

```typescript
export interface EventItemProps {
  readonly event: StarredEvent;
  readonly onUnstar: (eventId: string) => void;
  readonly adapter: IBrowserApiAdapter;
  readonly isConflicting?: boolean;
  readonly conflictTitles?: readonly string[];
  readonly locale: 'sv' | 'en'; // NEW
}
```

### EventRow Props (Modified)

```typescript
export interface EventRowProps {
  readonly event: StarredEvent;
  readonly onUnstar: (eventId: string) => void;
  readonly adapter: IBrowserApiAdapter;
  readonly locale: 'sv' | 'en'; // NEW
  readonly isSelected?: boolean;
  readonly onToggleSelection?: (eventId: string) => void;
  // REMOVED: isConflicting, conflictTitles
}
```

### EventList Props (Modified)

```typescript
export interface EventListProps {
  readonly events: readonly StarredEvent[];
  readonly onUnstar: (eventId: string) => void;
  readonly adapter: IBrowserApiAdapter;
  readonly conflictingIds?: ReadonlySet<string>;
  readonly conflictTitlesMap?: ReadonlyMap<string, readonly string[]>;
  readonly locale: 'sv' | 'en'; // NEW
}
```

### EventGrid Props (Modified)

```typescript
export interface EventGridProps {
  readonly events: readonly StarredEvent[];
  readonly sortOrder: SortOrder;
  readonly onUnstar: (eventId: string) => void;
  readonly adapter: IBrowserApiAdapter;
  readonly conflictingIds?: ReadonlySet<string>;
  readonly conflictTitlesMap?: ReadonlyMap<string, readonly string[]>;
  readonly selectedIds?: ReadonlySet<string>;
  readonly onToggleSelection?: (eventId: string) => void;
  readonly onSelectAll?: () => void;
  readonly allSelected?: boolean;
  readonly locale: 'sv' | 'en'; // NEW
}
```

### Star Button CSS Changes

The `STAR_BUTTON_CSS` constant in `star-button.ts` changes dimensions:

| Property                     | Before | After |
| ---------------------------- | ------ | ----- |
| `.star-btn` width/height     | 18px   | 32px  |
| `.star-btn svg` width/height | 14px   | 16px  |

## Data Models

No data model changes. Storage schema, message protocol, and event types remain unchanged.

## Correctness Properties

### Property 1: Locale propagation

For any rendered event date, the locale parameter passed to `formatEventDateTime` MUST equal the active UI locale (not a hardcoded value).

**Validates: Requirements 5.1, 5.2**

### Property 2: Conflict detection idempotence

Merging two `useMemo` calls into one MUST produce identical `conflictingIds` and `conflictTitlesMap` values as the original two separate calls.

**Validates: Requirements 7.1**

### Property 3: Bulk confirm threshold

`window.confirm` is called if and only if `selectedIds.size > 5`.

**Validates: Requirements 8.1, 8.2, 8.3**

### Property 4: License consistency

The SPDX identifier in package.json MUST match the LICENSE file content.

**Validates: Requirements 1.1**

## Testing Strategy

- **Task 2** (star button): Update star-button unit test to assert 32×32 button and 16×16 SVG dimensions.
- **Task 4** (locale prop): Write unit tests verifying `formatEventDateTime` is called with the prop locale value.
- **Task 5** (dedup): Existing property tests validate conflict detection correctness — no new tests needed.
- **Task 6** (bulk confirm): Unit tests mock `window.confirm` and verify threshold behavior.
- **Task 7** (shared hook): Unit tests verify getMessage override when locale is set and passthrough when null.
- **Task 8** (i18n): Unit test verifying substitution renders correctly in EventList.

## Error Handling

- If `window.confirm` throws (unlikely but possible in test environments), catch and default to not removing events.
- The `useLocalizedAdapter` hook falls back to the raw adapter `getMessage` when the locale override returns an empty string (maintaining existing behavior).
