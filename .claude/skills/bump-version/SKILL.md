---
name: bump-version
description: Bump the extension version for the next release across package.json, manifest.json, and scripts/release.js
disable-model-invocation: true
---

Bump the version of the pwgen-browser extension. The argument should be the semver bump type: `patch` (default), `minor`, or `major`.

Current version: !`node -p "require('./package.json').version"`

## Steps

1. Determine the current version from `package.json`.
2. Compute the new version based on the bump type ($ARGUMENTS or `patch` if not specified).
3. Update the `"version"` field in **`package.json`**.
4. Update the `"version"` field in **`manifest.json`**.
5. In **`scripts/release.js`**, update:
   - `TAG` to `'v<new_version>'`
   - `RELEASE_NAME` to `'Version <new_version>'`
   - `RELEASE_NOTES` to a short summary derived from the most recent commit message(s) since the last version bump.
6. Report the version change (e.g. `1.0.2 → 1.0.3`).

Do NOT commit the changes — just make the edits.
