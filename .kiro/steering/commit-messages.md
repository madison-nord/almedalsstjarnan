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

## Git Workflow

- After completing each top-level task (e.g., all of task 5, all of task 8), stage all changed files, commit with a message referencing the task number.
- Example: `feat(core): implement browser API adapter [Task 5]`
- Do not batch multiple top-level tasks into a single commit.
- Sub-tasks within the same top-level task may share a commit.
