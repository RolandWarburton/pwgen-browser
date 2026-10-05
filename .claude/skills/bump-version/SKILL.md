---
name: bump-version
description: Bump the extension version for the next release across deno.json, manifest.json, and scripts/release.ts
disable-model-invocation: true
---

Bump the version of the pwgen-browser extension. The argument should be the semver bump type: `patch` (default), `minor`, or `major`.

Current version: !`deno eval "console.log(JSON.parse(Deno.readTextFileSync('deno.json')).version)"`

## Steps

1. Determine the current version from `deno.json`.
2. Compute the new version based on the bump type ($ARGUMENTS or `patch` if not specified).
3. Update the `"version"` field in **`deno.json`**.
4. Update the `"version"` field in **`manifest.json`**.
5. In **`scripts/release.ts`**, update:
   - `TAG` to `'v<new_version>'`
   - `RELEASE_NAME` to `'Version <new_version>'`
   - `RELEASE_NOTES` to a short summary derived from the most recent commit message(s) since the last version bump.
6. Report the version change (e.g. `1.0.2 → 1.0.3`).

Do NOT commit the changes — just make the edits.
