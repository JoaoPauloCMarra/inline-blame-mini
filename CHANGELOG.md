# Changelog

## 0.2.0 - 2026-08-23

### Added

- Batched Git blame for the selected line and nearby prefetched lines.
- Regression coverage for Git parsing, cache invalidation, configuration filters, editor events, and concurrent requests.
- Extension-host checks for both VS Code 1.96.0 and the current stable release.
- Cursor 3.17.14 compatibility validation and Open VSX distribution guidance.

### Changed

- Replaced synchronous file checks in the cursor path with cached VS Code filesystem calls.
- Reduced editor selection handling to one debounce interval.
- Cached configuration snapshots and compiled file filters until settings change.
- Updated the development and packaging toolchain.
- Reduced the packaged runtime to the files required by the extension.

### Fixed

- Manual refresh now redraws blame without requiring the cursor to move.
- File status now reports the author and timestamp of the actual latest commit.
- Saving a file invalidates stale Git metadata before refreshing.
- Obsolete Git requests can no longer detach newer in-flight requests.
- Include and exclude patterns now match workspace-relative paths.
- Repeated format variables are replaced consistently.
- Excluded and oversized files no longer receive stale asynchronous status updates.
- Repositories initialized after the first lookup are detected correctly.

### Removed

- The unused platform abstraction and VS Code Git extension dependency.
- The ineffective `inline-blame-mini.showOnlyWhenChanged` setting.
- The unsupported `{prNumber}` and `{pr}` format variables.
- Unused formatting dependencies, caches, UI helpers, and compatibility code.

## 0.1.6 - 2026-05-04

- Added marketplace installation verification to the release process.
