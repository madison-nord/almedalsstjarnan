# Requirements Document

## Introduction

This feature improves the professional presentation of the Almedalsstjärnan GitHub repository for portfolio purposes. The scope includes repository metadata configuration, README enhancements (badges, screenshots section, feature documentation updates), removal of tracked build artifacts and generated reports, creation of a CHANGELOG, version bump to 1.0.0, and archiving completed specs. These changes make the project look polished and well-maintained to potential employers and collaborators.

Note: The Repository website URL should point to the Chrome Web Store listing once published. The `chrome-store-publishing` spec must complete first to obtain the Store listing URL, after which the Repository metadata can be finalized.

## Glossary

- **Repository**: The GitHub repository at github.com/madison-nord/almedalsstjarnan
- **README**: The README.md file at the repository root that serves as the project landing page
- **Badge**: A small status image embedded at the top of a README showing license or version info
- **Screenshots_Directory**: The `docs/screenshots/` directory containing screenshot documentation
- **CHANGELOG**: A CHANGELOG.md file at the repository root following Keep a Changelog format
- **Git_Tracking**: The state of a file being tracked by git version control
- **Gitignore**: The `.gitignore` file specifying patterns for files git should not track
- **Specs_Archive**: The `.kiro/specs/_archive/` directory containing completed spec documents moved out of the active specs folder
- **Version**: The semver version string declared in package.json and manifest base.json, currently "0.1.0"

## Requirements

### Requirement 1: Repository Metadata

**User Story:** As a recruiter or developer visiting the repository, I want to see a clear description, relevant topics, and a website link, so that I can quickly understand the project purpose and tech stack.

#### Acceptance Criteria

1. THE Repository SHALL display the description "Chrome extension to star events on almedalsveckan.info and export as ICS calendar"
2. THE Repository SHALL display the topics: chrome-extension, manifest-v3, typescript, react, vitest, almedalsveckan, ics-calendar, webextensions
3. THE Repository SHALL display the website URL pointing to the Chrome Web Store listing for the extension (set after the `chrome-store-publishing` spec completes and the extension is published)

### Requirement 2: README Badges

**User Story:** As a visitor to the repository, I want to see key project badges at the top of the README, so that I can quickly assess license and environment requirements.

#### Acceptance Criteria

1. THE README SHALL display a license badge showing "GPL-3.0" linked to the LICENSE file, positioned at the top of the file before any other content except the title
2. THE README SHALL display a Node version badge showing the minimum required Node.js version ">=20" adjacent to the license badge

### Requirement 3: Screenshots Section in README

**User Story:** As a visitor to the repository, I want to see a screenshots section demonstrating the extension, so that I can visually understand what the extension does without installing it.

#### Acceptance Criteria

1. THE README SHALL contain a "Screenshots" section positioned after the introduction paragraph and before the "Prerequisites" section
2. THE Screenshots section SHALL include image references for: the star button on almedalsveckan.info, the popup UI, and the stars page
3. THE Screenshots_Directory SHALL exist at the path `docs/screenshots/`
4. THE Screenshots_Directory SHALL contain a README.md file describing what screenshots are needed and their expected dimensions
5. WHEN a referenced screenshot image file does not exist, THE README SHALL display the alt text as a placeholder, ensuring some visual indication is always present even if the rendering mechanism varies by client

### Requirement 4: Remove playwright-report from Git Tracking

**User Story:** As a developer, I want generated test reports excluded from version control, so that the repository stays clean and only contains source files.

#### Acceptance Criteria

1. THE Gitignore SHALL contain an entry for `playwright-report/`
2. IF the `playwright-report/` directory was previously tracked by git, THEN it SHALL be removed from git's index using `git rm --cached`
3. THE `playwright-report/` directory SHALL NOT be tracked by git after the change is applied
4. WHEN a developer runs Playwright tests locally, THE generated report SHALL NOT appear as a changed file in git status

### Requirement 5: Remove almedalsstjarnan.zip from Git Tracking

**User Story:** As a developer, I want build artifacts excluded from version control, so that the repository stays clean and binary files do not inflate the repository size.

#### Acceptance Criteria

1. THE Gitignore SHALL contain a pattern matching `*.zip` files
2. IF the `almedalsstjarnan.zip` file was previously tracked by git, THEN it SHALL be removed from git's index using `git rm --cached`
3. THE `almedalsstjarnan.zip` file SHALL NOT be tracked by git after the change is applied
4. WHEN a developer runs `pnpm package`, THE generated zip file SHALL NOT appear as a changed file in git status

### Requirement 6: CHANGELOG Creation

**User Story:** As a visitor or contributor, I want to see a changelog documenting what has been built, so that I can understand the project history and current state of development.

#### Acceptance Criteria

1. THE CHANGELOG SHALL exist at the repository root as `CHANGELOG.md`
2. THE CHANGELOG SHALL follow Keep a Changelog format with sections: Added, Changed, Deprecated, Removed, Fixed, Security
3. THE CHANGELOG SHALL contain a v1.0.0 release entry marking the first public Chrome Web Store release
4. THE v1.0.0 entry SHALL document the following features under "Added": star and unstar events, bulk star with progress indicator, ICS calendar export, popup UI, stars page with search/sort/grid view, help/onboarding modal, language toggle (Swedish and English), undo support, and Shadow DOM content script isolation
5. THE CHANGELOG SHALL contain an "Unreleased" section at the top for future changes

### Requirement 7: Archive Completed Specs

**User Story:** As a developer navigating the project, I want completed specs moved to an archive directory, so that the active specs folder only shows work in progress and the repository appears well-organized.

#### Acceptance Criteria

1. THE Specs_Archive directory SHALL exist at `.kiro/specs/_archive/`
2. ALL completed spec directories (those whose tasks are fully checked off or that represent shipped features) SHALL be moved into Specs_Archive
3. THE active `.kiro/specs/` directory SHALL contain only the `github-portfolio-polish/` and `chrome-store-publishing/` spec directories (plus `_archive/`)
4. WHEN a spec is moved to the archive, THE move operation SHALL be atomic — either completing fully or rolling back to the original state
5. WHEN a spec is moved to the archive, THE directory structure and all files within it SHALL be preserved unchanged

### Requirement 8: Version Bump to 1.0.0

**User Story:** As a developer preparing the first public Chrome Web Store release, I want the version updated to 1.0.0, so that it accurately reflects the feature-complete state of the project (226+ commits, full star/unstar/export/bulk-star/i18n/help/search functionality).

#### Acceptance Criteria

1. THE `package.json` version field SHALL be set to "1.0.0"
2. THE `src/extension/manifest/base.json` version field SHALL be set to "1.0.0"
3. THE CHANGELOG v0.1.0 entry SHALL be renamed to v1.0.0 to reflect the first public release
4. WHEN version is updated, THE `pnpm run build` command SHALL complete without errors — any failure is treated as a blocker that must be resolved before proceeding

### Requirement 9: README Feature Documentation Update

**User Story:** As a visitor to the repository, I want the README to accurately describe all shipped features, so that I can understand the full capability of the extension.

#### Acceptance Criteria

1. THE README introduction paragraph SHALL mention all major shipped features: star/unstar events, bulk star, ICS calendar export, popup UI, full-page stars view with search and sorting, help/onboarding modal, language toggle (Swedish/English), and undo support
2. THE README architecture modules table SHALL include entries for: Bulk Star (bulk-star-button.ts, bulk-star-coordinator.ts, progress-indicator.ts) and Shared UI (HelpModal, LanguageToggle, SortSelector, UndoToast, SearchFilter)
3. THE README "Key Design Decisions" section SHALL mention the i18n runtime language switching approach and the bulk star rate-limiting/pagination strategy
4. THE README SHALL contain a "Features" section (after Screenshots, before Prerequisites) listing user-facing capabilities as bullet points
5. THE `src/features/README.md` SHALL be updated to remove the "No feature modules have been implemented yet" text and instead describe the project's feature architecture

### Requirement 10: CONTRIBUTING.md Update

**User Story:** As a potential contributor, I want CONTRIBUTING.md to reflect current project conventions and link to the Chrome Web Store listing, so that I can onboard without confusion.

#### Acceptance Criteria

1. THE CONTRIBUTING.md SHALL reference the commit format conventions inline rather than pointing to `.kiro/steering/git-workflow.md` (which is a tooling-internal file)
2. THE CONTRIBUTING.md SHALL include a section mentioning the Chrome Web Store listing URL (added after the extension is published)
3. THE CONTRIBUTING.md SHALL mention the project uses property-based testing with fast-check for core logic invariants
