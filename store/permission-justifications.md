# Permission Justifications

## Single Purpose Description

Star events on the Almedalsveckan programme website and export your personal schedule as an ICS calendar file.

## Permissions

| Permission | Justification |
| --- | --- |
| `storage` | Stores the user's starred events and preferences locally on their device. |
| `downloads` | Enables downloading ICS calendar file exports to the user's device. |

## Host Permissions

| Host Pattern | Justification |
| --- | --- |
| `*://almedalsveckan.info/*` | Content script injects star/bookmark buttons on the official Almedalsveckan programme page. |

## Content Scripts

| Match Pattern | Justification |
| --- | --- |
| `*://almedalsveckan.info/*` | Content script injects star/bookmark buttons on the official Almedalsveckan programme page. |
