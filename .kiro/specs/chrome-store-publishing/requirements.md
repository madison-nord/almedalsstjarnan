# Requirements Document

## Introduction

This feature prepares the Almedalsstjärnan Chrome extension for publication on the Chrome Web Store as a free extension. It covers all submission artifacts and compliance checks required by the Chrome Web Store review process: privacy policy, store listing assets, permission justifications, single-purpose description, dependency vulnerability resolution, and build output verification. Developer account registration (the $5 fee) is handled separately and excluded from this spec.

## Glossary

- **Extension**: The Almedalsstjärnan Chrome browser extension (Manifest V3) that allows users to star events on almedalsveckan.info and export them as ICS calendar files.
- **Chrome_Web_Store**: Google's marketplace for distributing Chrome extensions to end users.
- **Privacy_Policy**: A publicly accessible document describing what user data the Extension collects, stores, and transmits.
- **Store_Listing**: The public-facing page on Chrome_Web_Store containing the Extension's description, screenshots, and metadata.
- **Permission_Justification**: A textual explanation submitted during Chrome_Web_Store review explaining why each declared permission is necessary.
- **Single_Purpose_Description**: A concise statement describing the Extension's sole purpose, required by Chrome_Web_Store policy.
- **Production_Dependency**: A package listed under `dependencies` in package.json that is included in the built Extension.
- **Build_Output**: The packaged .zip file produced by the `pnpm package` command, intended for upload to Chrome_Web_Store.
- **Verify_Script**: A script or CI step that inspects Build_Output contents and fails if disallowed files are present.
- **Store_Directory**: A `store/` directory in the repository root containing Chrome_Web_Store listing documentation and placeholder assets.

## Requirements

### Requirement 1: Privacy Policy Document

**User Story:** As a developer publishing the Extension, I want a privacy policy document available at a public URL and in the repository, so that Chrome_Web_Store submission requirements are satisfied.

#### Acceptance Criteria

1. THE Extension repository SHALL contain a `PRIVACY.md` file in the repository root describing the Extension's data practices.
2. THE Privacy_Policy SHALL state that the Extension stores data exclusively using chrome.storage.local on the user's device.
3. THE Privacy_Policy SHALL state that the Extension does not collect any user data.
4. THE Privacy_Policy SHALL state that the Extension does not transmit data to any external server.
5. THE Privacy_Policy SHALL state that the Extension does not use analytics or tracking.
6. THE Privacy_Policy SHALL include the date of last update.
7. THE Store_Directory SHALL contain a README section documenting how to host the Privacy_Policy at a public URL using GitHub Pages or a raw GitHub file link.

### Requirement 2: Store Listing Assets

**User Story:** As a developer publishing the Extension, I want all Chrome_Web_Store listing assets documented and prepared, so that the store listing can be completed during submission.

#### Acceptance Criteria

1. THE Store_Directory SHALL exist at the repository root path `store/`.
2. THE Store_Directory SHALL contain a `README.md` documenting all required and recommended Chrome_Web_Store listing assets.
3. THE Store_Directory README SHALL document that at least one screenshot is required with dimensions 1280×800 or 640×400 pixels.
4. THE Store_Directory README SHALL document that a small promotional tile of 440×280 pixels is optional but recommended.
5. THE Store_Directory SHALL contain a store description text in Swedish.
6. THE Store_Directory SHALL contain a store description text in English.
7. THE Store_Directory README SHALL specify that the store category is "Productivity".
8. WHEN a screenshot is added to the Store_Directory, THE screenshot SHALL depict the Extension in active use on the almedalsveckan.info programme page.

### Requirement 3: Permission Justifications

**User Story:** As a developer submitting the Extension for review, I want pre-written permission justifications, so that I can paste them into the Chrome_Web_Store submission form without delay.

#### Acceptance Criteria

1. THE Store_Directory SHALL contain a `permission-justifications.md` file.
2. THE permission justification for the `storage` permission SHALL state: "Stores the user's starred events and preferences locally on their device."
3. THE permission justification for the `downloads` permission SHALL state: "Enables downloading ICS calendar file exports to the user's device."
4. THE permission justification for `host_permissions` on almedalsveckan.info SHALL state: "Content script injects star/bookmark buttons on the official Almedalsveckan programme page."
5. THE `permission-justifications.md` file SHALL list each permission declared in the manifest alongside its justification.

### Requirement 4: Single Purpose Description

**User Story:** As a developer submitting the Extension for review, I want a documented single-purpose statement, so that Chrome_Web_Store single-purpose policy compliance is clearly demonstrated.

#### Acceptance Criteria

1. THE Store_Directory SHALL document the Single_Purpose_Description.
2. THE Single_Purpose_Description SHALL be: "Star events on the Almedalsveckan programme website and export your personal schedule as an ICS calendar file."
3. THE `permission-justifications.md` file SHALL include the Single_Purpose_Description in a dedicated section.

### Requirement 5: Resolve Dependency Vulnerabilities

**User Story:** As a developer preparing the Extension for Chrome_Web_Store review, I want all high-severity production dependency vulnerabilities resolved, so that automated security checks during review do not flag the Extension.

#### Acceptance Criteria

1. WHEN `pnpm audit --prod --audit-level=high` is executed, THE audit command SHALL exit with code 0 (no high or critical vulnerabilities).
2. WHEN production dependency vulnerabilities are resolved, THE Extension SHALL first attempt direct version updates of vulnerable packages and MAY use pnpm overrides only for transitive dependencies that cannot be updated directly.
3. WHEN dependency versions are updated, THE Extension build (`pnpm run build`) SHALL complete without errors.
4. WHEN dependency versions are updated, THE Extension test suite (`pnpm run test:unit`) SHALL pass without regressions.

### Requirement 6: Verify Clean Build Output

**User Story:** As a developer packaging the Extension for upload, I want automated verification that the .zip file contains only production-necessary files, so that Chrome_Web_Store review is not delayed by extraneous or sensitive files in the submission.

#### Acceptance Criteria

1. THE Build_Output SHALL NOT contain source map files (files ending in `.map`).
2. THE Build_Output SHALL NOT contain the `.kiro/` directory or any of its contents.
3. THE Build_Output SHALL NOT contain test files or the `tests/` directory.
4. THE Build_Output SHALL NOT contain the `node_modules/` directory.
5. THE Build_Output SHALL contain compiled JavaScript files, `manifest.json`, the `_locales/` directory, the `icons/` directory, and HTML files.
6. THE Verify_Script SHALL inspect the contents of Build_Output after `pnpm package` completes.
7. IF the Verify_Script detects disallowed files in Build_Output, THEN THE Verify_Script SHALL exit with a non-zero code and print the list of disallowed files.
8. IF the Build_Output is missing any required file (manifest.json, compiled JavaScript, `_locales/` directory, `icons/` directory, or HTML files), THEN THE Verify_Script SHALL exit with a non-zero code and print the list of missing required files.
9. THE CI pipeline SHALL include a step that runs the Verify_Script after the build step.
