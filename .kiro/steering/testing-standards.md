---
inclusion: always
---

# Testing Standards

## TDD Workflow

1. Write a failing test that describes the desired behavior.
2. Write the minimal implementation to make the test pass.
3. Refactor while keeping tests green.
4. Repeat.

All tests are mandatory. Never skip or defer test writing.

## Test File Naming

- Unit tests: `{module}.test.ts` or `{module}.test.tsx` in `tests/unit/`
- Property-based tests: `{name}.property.test.ts` in `tests/property/`
- E2E tests: `{flow}.e2e.test.ts` in `tests/e2e/`

## Unit Tests (Vitest)

- Mock `IBrowserApiAdapter` in ALL unit tests via the shared mock helper at `tests/helpers/mock-browser-api.ts`.
- Never call real `chrome.*` APIs in tests.
- Test both success and error paths.
- Test edge cases: empty arrays, null fields, missing storage keys.
- Use `describe` / `it` blocks with descriptive names.

## Property-Based Tests (fast-check)

- Use fast-check with a minimum of 100 iterations (`numRuns: 100`).
- Write custom arbitraries in `tests/helpers/event-generators.ts`.
- Tag every property test with a comment: `// Feature: almedals-planner-extension, Property {N}: {title}`.
- Properties to test:
  - ICS round-trip preservation (generate → parse → compare)
  - Sorter idempotence (sort twice = sort once)
  - Sorter length preservation (output length = input length)
  - Sorter ordering correctness (adjacent pairs satisfy comparison)
  - Sorter non-mutation (original array unchanged)
  - Normalizer whitespace trimming
  - Normalizer required field rejection

## E2E Tests (Playwright)

- Build the extension first, then load as unpacked in Chromium.
- Test only critical flows: star/unstar and ICS export.
- Use `tests/e2e/` directory.

## Coverage

- All exported functions in `src/core/` must have unit tests.
- Coverage provider: v8.
- Exclude `types.ts` and `index.ts` from coverage metrics.

## DOM Testing

- Use `fixtures/almedalsveckan-program-2026.html` for content script tests.
- Use `tests/helpers/dom-helpers.ts` for creating mock Event_Card elements.

## Mocking

- The shared mock at `tests/helpers/mock-browser-api.ts` is auto-loaded via vitest `setupFiles`.
- Reset mocks between tests using the exported `resetMocks()` utility.
- Never use mocks to make tests pass artificially — tests must validate real logic.
