# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Chrome extension (Manifest V3) for generating random passwords using word lists via the `@rolandwarburton/pwgen` npm package, and saving them in **OpenBao** (KV v2). It provides password generation, tabbed password lists, QR codes and clipboard copy. The whole UI lives in Chrome's side panel; clicking the toolbar icon opens it (there is no popup).

Saved tabs and passwords live only in OpenBao: the panel is a live view of `kv/pwgen/`, and nothing is cached locally. Sign-in is through Dex OIDC. The repo also holds an MCP server (`mcp/`) that gives claude.ai the same tabs and passwords. Server setup (policies, Dex clients, OIDC role, AppRole) is in `README.md`.

The OpenBao address comes from `BAO_ADDR` (environment, else `.env`) at build time: `scripts/build.ts` writes it to `src/config.gen.ts` (gitignored; `deno bundle` has no `--define`), which `src/storage/index.ts` imports for `defaultSettings.baoAddress`, and into `host_permissions` in `dist/manifest.json`. The repo only holds the `openbao.example.net` placeholder. It's read-only in Settings and always overrides the saved value.

## Build & Lint

The extension is built with Deno 2 (`deno.json`: tasks, import map, compiler options; no `package.json` or `node_modules`). The MCP server is still Node.

```bash
deno task build    # scripts/build.ts — writes src/config.gen.ts, `deno bundle`s src/sidepanel.tsx + src/background.ts → dist/, plus manifest.json (host_permissions from BAO_ADDR), static/sidepanel.html, images/
deno task lint     # deno lint on src/ and scripts/
deno task check    # build (to generate config.gen.ts), then `deno check src/` — bundle doesn't type-check
deno task release  # scripts/release.ts — builds, zips dist/, publishes a GitHub release via `gh` (does NOT bump the version)

cd mcp && npm install && npm run build   # the MCP server, a separate Node package
```

- Version bumps are done with the `/bump-version` skill (`.claude/skills/bump-version/`), which updates `deno.json`, `manifest.json`, and the `TAG`/`RELEASE_NAME`/`RELEASE_NOTES` constants in `scripts/release.ts`.
- Load `/dist` as an unpacked extension in `chrome://extensions/`. No dev server — rebuild and reload the extension manually.
- `manifest.json` has a public `key`, which fixes the extension ID at `lmlfepmjcaglddfjhnegdfmfdheacjcj` for every unpacked install. Dex and OpenBao only accept sign-ins that return to `https://<that id>.chromiumapp.org/cb`, so don't change or remove the key. The private `.pem` is gitignored.
- `scripts/build.ts` copies static files one by one, so a new file in `static/` must also be added there.
- npm packages are mapped in `deno.json` `imports` (`npm:` specifiers); add new dependencies there (`deno add npm:<pkg>`).

## Architecture

- **Entry points**: `src/sidepanel.tsx` (side panel, routes `*` → app, `/settings`, `/qr?password=&back=`, `/generator`; uses `createHashRouter` + Goober CSS-in-JS via `setup(React.createElement)`; renews the OpenBao token on load) and `src/background.ts` (service worker that makes the toolbar icon open the side panel).
- **Pages**: `src/pages/{app,generator,settings,qr}/`. `pages/app/popup.tsx` is the main panel (named from when the UI was a popup): tabs, the password field and the list. Settings has the OpenBao section with Sign in / Sign out.
- **OpenBao**: `src/openbao/`
  - `session.ts`: the token in `chrome.storage.local` (`baoSession`), and the `useBaoSession()` hook
  - `client.ts`: `fetch` wrapper and typed errors (`AuthError` clears the session, `NotFoundError`, `ConflictError` for a failed check-and-set, `NetworkError`), plus `kv(settings)` helpers
  - `auth.ts`: `signIn` (OIDC through `chrome.identity.launchWebAuthFlow`), `renewIfNeeded`, `signOut`
  - `passwords.ts`: tabs and passwords on KV (`loadTabs`, `createTab`, `loadPasswords`, `addPassword`, `updatePassword`, …)
- **Shared components**: `src/components/` — `password-row/` (list item with actions; notes are saved 600 ms after typing stops), `tabs/` (password list tabs), `icons/` (inline SVG), `styles/` (Goober styled components)
- **Static files**: `static/` — `sidepanel.html`
- **Types**: `src/types/index.ts` — `ISettings`, `IPassword`, `ITab`, `IBaoSession`
- **Path aliases** (`deno.json` imports): `@/` → `src/`, `@components/` → `src/components/`, `@types` → `src/types/index.ts`
- `@rolandwarburton/pwgen` has no types; its imports carry `// @ts-types="…/types/pwgen.d.ts"`

## Data Layer

### OpenBao (tabs and passwords)

Mount `kv` (KV v2), base path `pwgen/`, reached with the extension's `pwgen-user` policy:

| Path | Contents |
|---|---|
| `pwgen/_tabs` | `{ next: "N" }`: the next tab number. Claimed with check-and-set, so numbers only count up |
| `pwgen/tab-N/_tab` | `{ name, order }`: a tab's display name and position. The folder name `tab-N` never changes; renaming only changes `name` |
| `pwgen/tab-N/<uuid>` | one password: `data: { password }`; `custom_metadata`: `note`, `flagged`, `hidden`, `source`, `created_by` |

- Keys starting with `_` are never passwords.
- Every write of a password value is a new KV version. Writes use check-and-set (`cas`): `0` to create, the current version to edit, so a change made elsewhere raises `ConflictError` instead of being overwritten. OpenBao keeps 10 versions; the extension doesn't show them.
- `custom_metadata` is changed with `PATCH` only (the policy has no create/update on `kv/metadata`). Values must be 1–512 bytes: empty values are left out, and `null` removes a key.
- A password whose metadata is gone, or whose current version is deleted or destroyed, counts as gone and is dropped from the view. The panel reloads on open, on `visibilitychange`, and re-checks a password before copy, QR and reveal.
- UI actions update the screen first, then write; a failed write rolls the row back and shows an error banner.

### `chrome.storage.local`

| Key | Contents | Helpers |
|---|---|---|
| `settings` | `ISettings`: generator options plus `baoAddress`, `baoMount`, `baoBasePath`, `baoRole` | `getSettings` (merged over `defaultSettings`, so new fields get defaults), `saveSettings` in `src/storage/index.ts` |
| `activeTabId` | the selected tab's slug | `getActiveTabId` (falls back to the first tab), `saveActiveTabId` |
| `baoSession` | `IBaoSession`: the OpenBao token (99-day lease), expiry and display name | `src/openbao/session.ts` |

No tabs or passwords are stored locally, and there is no password history. State management is plain React hooks — no global store.

## MCP Server (`mcp/`)

A separate Node package (own `package.json` and `tsconfig.json`), deployed with Docker behind Traefik and added to claude.ai as a custom connector at `https://pwgen-mcp.<MCP_DOMAIN>/mcp`. HTTP only (stateless Streamable HTTP).

- `src/index.ts` (HTTP routes), `src/auth.ts` (checks the claude.ai Dex token: audience `pwgen-mcp`, email allowlist; serves Protected Resource Metadata), `src/bao.ts` (OpenBao client with the server's own AppRole login), `src/passwords.ts` (the same KV rules as the extension), `src/server.ts` (tools), `src/config.ts` (environment).
- Tools are generic: `list_tabs`, `create_tab`, `list_passwords`, `find_passwords`, `get_password_metadata`, `get_password` (the only one returning a password), `create_password`, `update_password`, `update_password_metadata`, `delete_password`.
- Configuration is environment only (`mcp/.env.example`). Deploy or update: copy `mcp/` (without `node_modules`, `dist`, `.env`) to the server and run `docker compose up -d --build`. The server's `.env` holds the AppRole credentials and is never committed.

## Conventions

- ESM throughout; imports use explicit file extensions (`./client.ts`, `@components/styles/index.ts`), as Deno requires
- JSX uses the automatic runtime (`react-jsx`), so `import React` is only needed for `React.*` references
- TypeScript strict mode, single quotes, semicolons, no trailing commas (`deno.json` `fmt`)
- Unused variables must be prefixed with `_`
- Routing via react-router v8; query params carry page input and navigation context (e.g., `/qr?password=…&back=…`, `/generator?back=…`)
- No `confirm()` dialogs (they freeze the side panel): destructive actions use a two-click confirm
