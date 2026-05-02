---
inclusion: always
---

# Coding Conventions

## TypeScript

- Strict mode is enabled with `noUncheckedIndexedAccess: true` and `noImplicitOverride: true`.
- Use `readonly` for all interface and type properties.
- Never use `any`. Use `unknown` and narrow with type guards.
- Use `as const` assertions for literal types and constant arrays.
- Use discriminated unions for result types (ok/error pattern, e.g., `NormalizerResult`).

## Import Ordering

Imports must follow this order, separated by blank lines:

1. External libraries (`react`, `vitest`, `fast-check`, etc.)
2. `#core/*` imports
3. `#extension/*` imports
4. `#ui/*` imports
5. `#features/*` imports
6. `#test/*` imports
7. Relative imports (`./`, `../`)

Never use relative imports that cross module boundaries. Use `#` path aliases instead.

## Naming Conventions

- **Files**: `kebab-case.ts` (e.g., `browser-api-adapter.ts`, `event-normalizer.ts`)
- **Types / Interfaces**: `PascalCase` (e.g., `NormalizedEvent`, `IBrowserApiAdapter`)
- **Functions / Variables**: `camelCase` (e.g., `normalizeEvent`, `sortEvents`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `SORT_ORDERS`, `MESSAGE_COMMANDS`)

## React

- Functional components only. No class components.
- Props interfaces named `{Component}Props` (e.g., `EventListProps`).
- Hooks in dedicated `hooks/` directories within each UI module.
- No inline styles. Use Tailwind classes (popup/stars) or scoped CSS (star button).

## CSS

- **Popup UI and Stars Page**: Tailwind CSS only.
- **Star Button (Shadow DOM)**: Plain scoped CSS. No Tailwind in content script.
- Never leak Tailwind into the content script or host page.

## File Structure

- One exported function or class per file where practical.
- Test files mirror the source structure under `tests/`.
- Barrel exports (`index.ts`) only in `src/core/`.

## Error Handling

- Use `Result` / discriminated union types for expected errors (e.g., `NormalizerResult`).
- Use `try/catch` with `MessageResponseError` for unexpected errors in background handlers.
- Never throw from content script code — catch and log warnings instead.
