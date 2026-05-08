---
inclusion: always
---

# Commit Message Format

## Structure

```
<type>(<scope>): <subject>

[optional body]
```

## Types

| Type | Usage |
|---|---|
| `feat` | New feature or functionality |
| `fix` | Bug fix |
| `test` | Adding or updating tests |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `docs` | Documentation changes |
| `chore` | Build process, tooling, or dependency changes |
| `style` | Formatting, whitespace, or code style changes (no logic change) |

## Scopes

| Scope | Covers |
|---|---|
| `core` | Shared core modules (`src/core/`) |
| `content` | Content script (`src/extension/content-script.ts`, `star-button.ts`) |
| `background` | Background service worker (`src/extension/background.ts`) |
| `popup` | Popup UI (`src/ui/popup/`) |
| `stars` | Stars page (`src/ui/stars/`) |
| `manifest` | Manifest configuration (`src/extension/manifest/`) |
| `i18n` | Locale files (`_locales/`) |
| `ci` | CI/CD configuration (`.github/workflows/`) |
| `config` | Project configuration (tsconfig, vite, eslint, etc.) |

## Rules

- Use imperative mood in the subject: "add sorter module" not "added sorter module".
- Lowercase subject, no period at the end.
- Maximum 70 characters for the subject line.
- Wrap body text at 72 characters.
- Reference requirements: `Implements Req X.Y` or `Validates Req X.Y`.

## Pre-Commit Verification — MANDATORY

**CRITICAL: You MUST run lint and typecheck before every commit. Do NOT commit code that fails these checks.**

Before staging and committing, run:
1. `pnpm run lint` — fix all ESLint errors (unused imports, unused vars, type-only imports, etc.)
2. `pnpm run typecheck` — fix all TypeScript errors

If either command fails, fix the issues before committing. Do NOT use `--no-verify` or skip these steps.

Common issues to watch for:
- Unused imports (remove them or prefix with `_`)
- Imports used only as types (use `import type` syntax)
- Unused variables (remove or prefix with `_`)

## Git Workflow — MANDATORY

**CRITICAL: You MUST commit and push after completing each top-level task. This is non-negotiable. Do NOT proceed to the next task until the current task's changes are committed and pushed.**

1. After completing each top-level task (e.g., all of task 5, all of task 8):
   - Stage all changed files related to that task.
   - Commit with a message referencing the task number.
   - Push to origin immediately.
2. Only then proceed to the next task.
3. Do not batch multiple top-level tasks into a single commit.
4. Sub-tasks within the same top-level task may share a commit.
5. Push directly to main unless instructed otherwise.

Example workflow after finishing Task 5:
```
git add <files>
git commit -m "feat(core): implement browser API adapter [Task 5]"
git push
```

If you forget to commit after a task, you are violating this rule. Stop and commit before continuing.
