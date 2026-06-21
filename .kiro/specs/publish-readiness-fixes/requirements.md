# Requirements Document

## Introduction

This feature addresses the remaining technical gaps preventing immediate publication of the Almedalsstjärnan Chrome extension on the Chrome Web Store. The prior chrome-store-publishing spec covered documentation, store assets, permission justifications, and build verification — all complete. This spec covers five outstanding items: fixing the cross-platform packaging script, hosting the privacy policy at a public URL, investigating the large shared chunk size, verifying stars page CSS bundling, and resolving Dependabot security alerts in devDependencies.

## Glossary

- **Packaging_Script**: The `scripts/package.ts` file that creates the `almedalsstjarnan.zip` from the `dist/` directory for Chrome Web Store upload.
- **Privacy_Policy**: The `PRIVACY.md` file in the repository root describing data practices, which must be hosted at a publicly accessible URL.
- **GitHub_Pages**: A GitHub-provided static hosting service that renders Markdown files as formatted HTML pages from a repository branch.
- **Shared_Chunk**: The `dist/conflict-detector.js` file (approximately 230 KB uncompressed), a Vite-generated shared chunk used by the stars page entry point.
- **Stars_Page**: The full-tab extension page (`stars.html`) showing starred events with filtering, sorting, and export capabilities.
- **Stars_CSS**: The `dist/stars.css` file produced during the Vite build, containing styles for the Stars_Page.
- **Dependabot_Alerts**: GitHub's automated vulnerability notifications for dependencies with known security issues.
- **DevDependency**: A package listed under `devDependencies` in package.json, used only during development and build — not included in the distributed Extension.
- **CWS**: Chrome Web Store.
- **CI_Pipeline**: The GitHub Actions workflow (`.github/workflows/ci.yml`) that runs lint, typecheck, tests, build, and package verification on every push and pull request.

## Requirements

### Requirement 1: Cross-Platform Packaging Script

**User Story:** As a developer working on Windows, I want the packaging script to produce a valid .zip file on both Windows and Linux, so that I can locally package the extension for CWS upload without relying on CI.

#### Acceptance Criteria

1. WHEN `pnpm package` is executed on Windows, THE Packaging_Script SHALL produce an `almedalsstjarnan.zip` file in the repository root and exit with code 0.
2. WHEN `pnpm package` is executed on Linux, THE Packaging_Script SHALL produce an `almedalsstjarnan.zip` file in the repository root and exit with code 0.
3. THE Packaging_Script SHALL use a zip creation method that does not depend on PowerShell argument passing via `$args` positional parameters.
4. WHEN the Packaging_Script completes on any platform, THE resulting zip SHALL contain all files from the `dist/` directory with paths relative to `dist/` (e.g., `manifest.json` not `dist/manifest.json`), no additional wrapper directories, and no files omitted.
5. WHEN the Packaging_Script produces a zip file, THE Verify_Script (`scripts/verify-package.ts`) SHALL pass validation against the zip contents without errors.
6. THE Packaging_Script SHALL NOT introduce additional runtime dependencies (the solution must use Node.js built-in APIs or the existing `devDependencies`).
7. IF the `dist/` directory does not exist when `pnpm package` reaches the zip-creation step, THEN THE Packaging_Script SHALL exit with a non-zero exit code and print an error message indicating that the dist directory is missing.

### Requirement 2: Host Privacy Policy at Public URL via GitHub Pages

**User Story:** As a developer submitting the extension to CWS, I want the privacy policy hosted at a publicly accessible URL rendered as formatted HTML, so that I can enter the URL in the CWS developer dashboard and reviewers see a professional document.

#### Acceptance Criteria

1. THE repository SHALL contain a GitHub Pages deployment configuration that publishes `PRIVACY.md` from the `main` branch as a rendered HTML page.
2. WHEN the GitHub Pages workflow completes successfully, THE privacy policy page SHALL be served at `https://madison-nord.github.io/almedalsstjarnan/PRIVACY` with an HTTP 200 response and content rendered as formatted HTML (not raw Markdown source).
3. THE GitHub Pages configuration SHALL be implemented as a GitHub Actions workflow file in `.github/workflows/`.
4. THE GitHub Pages workflow SHALL trigger on pushes to the `main` branch that modify `PRIVACY.md` or the workflow file itself.
5. THE GitHub Pages workflow SHALL deploy only the privacy policy content (not the entire repository tree as a website).
6. THE `store/README.md` SHALL contain the literal privacy policy URL (`https://madison-nord.github.io/almedalsstjarnan/PRIVACY`) in its hosting documentation section.

### Requirement 3: Investigate and Reduce Shared Chunk Size

**User Story:** As a developer preparing for CWS review, I want the shared chunk size investigated and reduced where possible, so that CWS reviewers do not flag the extension for bloated JavaScript bundles.

#### Acceptance Criteria

1. WHEN the build completes, THE repository SHALL contain a `BUNDLE-ANALYSIS.md` file listing each module and dependency that contributes to the Shared_Chunk (`dist/conflict-detector.js`) along with its approximate size contribution in KB.
2. WHEN tree-shaking or code-splitting opportunities exist that reduce the Shared_Chunk below 150 KB uncompressed file size, THE Vite configuration SHALL be updated to apply the optimization.
3. IF the Shared_Chunk cannot be reduced below 150 KB uncompressed after applying available tree-shaking and code-splitting techniques, THEN THE `BUNDLE-ANALYSIS.md` file SHALL include a justification section explaining what essential modules the chunk contains and why each is required.
4. WHEN optimizations are applied, THE Extension build SHALL complete without errors.
5. WHEN optimizations are applied, THE Extension test suite (unit, property, and E2E tests) SHALL pass with all previously-passing tests still passing.
6. THE total `dist/` directory uncompressed size SHALL remain below 500 KB after any changes.

### Requirement 4: Verify Stars Page CSS Bundling

**User Story:** As a developer preparing for CWS submission, I want confirmation that the stars page renders correctly with the built assets, so that users see a properly styled page after installation.

#### Acceptance Criteria

1. WHEN the Vite build completes, THE Stars_CSS file (`dist/stars.css`) SHALL contain at least 1 KB of CSS content including Tailwind utility classes used by the Stars_Page components (e.g., `min-h-screen`, `flex`, `border-collapse`, `bg-brand-surface`).
2. WHEN the Stars_Page HTML (`dist/src/ui/stars/stars.html`) is loaded in a browser, THE page SHALL contain a `<link>` element whose `href` attribute resolves to the Stars_CSS file so that styles are applied on load.
3. IF the Stars_CSS file is empty or the built Stars_Page HTML references a different stylesheet that does not contain the Stars_Page Tailwind classes, THEN THE Vite build configuration or PostCSS configuration SHALL be corrected so that the Stars_Page HTML references a CSS file containing all required Tailwind utility classes.
4. WHEN the stars page is loaded with the built extension, THE page layout SHALL render with the correct Tailwind-based structure: a full-height flex column layout (`min-h-screen flex flex-col`), a styled header with brand colors, and a data table with defined column widths and border styling — with no unstyled or broken elements visible.
5. THE E2E test suite SHALL include at least one assertion that verifies the stars page CSS is applied by checking that a rendered element (e.g., the header or the root container) has a computed `display` value of `flex` and a computed `min-height` of `100vh`, confirming styles loaded successfully.

### Requirement 5: Resolve Dependabot Security Alerts

**User Story:** As a repository maintainer, I want all Dependabot vulnerability alerts resolved, so that the repository has a clean security posture and CI is not at risk of failing if audit scope changes.

#### Acceptance Criteria

1. WHEN `pnpm audit` (without `--prod` flag) is executed, THE audit command SHALL report zero critical or high severity vulnerabilities.
2. IF a Dependabot alert identifies a devDependency with a patched version available, THEN THE package.json SHALL specify a dependency version at or above the patched version indicated in the advisory.
3. WHERE a direct version update is not available for a transitive devDependency vulnerability, THE `pnpm.overrides` field in package.json SHALL specify a patched version that resolves the advisory.
4. WHEN devDependencies are updated, THE extension build (`pnpm run build`) SHALL complete with exit code 0.
5. WHEN devDependencies are updated, THE lint check (`pnpm run lint`) SHALL complete with exit code 0.
6. WHEN devDependencies are updated, THE typecheck (`pnpm run typecheck`) SHALL complete with exit code 0.
7. WHEN devDependencies are updated, THE unit and property test suites (`pnpm run test`) SHALL complete with exit code 0 and the same number of passing tests as before the update.
8. IF a moderate or low severity alert cannot be resolved without a semver-major version upgrade that causes build or test failures, THEN THE alert SHALL be documented in a `SECURITY.md` or issue tracker entry with the advisory ID, affected package, and reason for deferral.
