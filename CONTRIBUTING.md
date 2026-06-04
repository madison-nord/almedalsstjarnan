# Contributing

## Prerequisites

- Node.js >= 20 (see `.nvmrc`)
- pnpm (managed via `packageManager` field in `package.json`)

## Setup

```bash
git clone https://github.com/madison-nord/almedalsstjarnan.git
cd almedalsstjarnan
pnpm install
```

## Development Workflow

This project follows **Test-Driven Development (TDD)**:

1. Write a failing test that describes the desired behavior.
2. Write the minimal implementation to make the test pass.
3. Refactor while keeping tests green.
4. Repeat.

## Running Tests

```bash
# All tests
pnpm test

# Unit tests only
pnpm run test:unit

# Property-based tests only
pnpm run test:property

# E2E tests (requires built extension + Playwright browsers)
pnpm run build
npx playwright install chromium
pnpm run test:e2e
```

## Other Commands

```bash
pnpm run lint          # ESLint
pnpm run lint:fix      # ESLint with auto-fix
pnpm run typecheck     # TypeScript type checking
pnpm run format        # Prettier formatting
pnpm run build         # Production build
pnpm run package       # Build + zip for distribution
```

## Commit Format

This project uses structured commit messages. See `.kiro/steering/git-workflow.md` for full details.

```
<type>(<scope>): <subject>
```

**Types:** `feat`, `fix`, `test`, `refactor`, `docs`, `chore`, `style`

**Scopes:** `core`, `content`, `background`, `popup`, `stars`, `manifest`, `i18n`, `ci`, `config`

Rules:
- Imperative mood: "add feature" not "added feature"
- Lowercase subject, no trailing period
- Maximum 70 characters for the subject line

## Pre-Commit Checks

Before committing, always run:

```bash
pnpm run lint
pnpm run typecheck
pnpm test
```

All three must pass before pushing.

## Coding Conventions

- **TypeScript strict mode** with `noUncheckedIndexedAccess` and `noImplicitOverride`
- **`readonly`** on all interface properties
- **No `any`** — use `unknown` with type guards
- **Discriminated unions** for result types (ok/error pattern)
- **Files:** `kebab-case.ts`
- **Types/Interfaces:** `PascalCase`
- **Functions/Variables:** `camelCase`
- **Constants:** `UPPER_SNAKE_CASE`
- **Imports:** use `#core/*`, `#extension/*`, `#ui/*`, `#features/*`, `#test/*` path aliases (no cross-boundary relative imports)

See `.kiro/steering/coding-conventions.md` for the complete reference.
