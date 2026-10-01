# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Chrome extension (Manifest V3) for generating random passwords using word lists via the `@rolandwarburton/pwgen` npm package. Provides password generation, tabbed password lists, history, QR codes, and clipboard copy. The whole UI lives in Chrome's side panel; clicking the toolbar icon opens it (there is no popup).

## Build & Lint

```bash
npm run build    # node build.js — esbuild bundle: src/sidepanel.tsx + src/background.ts → dist/, plus copies manifest.json, static/sidepanel.html, images/
npm run lint     # ESLint on src/ and build.js
npm run release  # scripts/release.js — builds, zips dist/, publishes a GitHub release via `gh` (does NOT bump the version)
```

- Version bumps are done with the `/bump-version` skill (`.claude/skills/bump-version/`), which updates `package.json`, `manifest.json`, and the `TAG`/`RELEASE_NAME`/`RELEASE_NOTES` constants in `scripts/release.js`.
- The esbuild build does not type-check. Use `npx tsc --noEmit -p .` for that.
- Load `/dist` as an unpacked extension in `chrome://extensions/`. No dev server — rebuild and reload the extension manually.
- `build.js` copies static files one by one, so a new file in `static/` must also be added there.

## Architecture

- **Entry points**: `src/sidepanel.tsx` (side panel, routes `*` → app, `/settings`, `/history`, `/qr/:param`, `/generator`; uses `createHashRouter` + Goober CSS-in-JS via `setup(React.createElement)`) and `src/background.ts` (service worker that makes the toolbar icon open the side panel).
- **Pages**: `src/pages/{app,generator,settings,history,qr}/` — each page loads its own data from Chrome storage. (`pages/app/popup.tsx` is named from when the UI was a popup.)
- **Shared components**: `src/components/` — `password-row/` (list item with actions), `tabs/` (password list tabs), `icons/` (inline SVG), `styles/` (Goober styled components)
- **Static files**: `static/` — `sidepanel.html`
- **Types**: `src/types/index.ts` — `ISettings`, `IPassword`, `ITab`
- **Path aliases** (tsconfig): `@/*` → `src/*`, `@components/*` → `src/components/*`, `@types` → `src/types`

## Data Layer

All persistence via `chrome.storage.local`, wrapped by helpers in `src/storage/index.ts`:

| Key | Contents | Helpers |
|---|---|---|
| `settings` | `ISettings` | `getSettings` (merged over `defaultSettings`, so new fields get defaults), `saveSettings` |
| `tabs` | `ITab[]`, each with its own `IPassword[]` | `getTabs` (falls back to one "Passwords" tab), `saveTabs`, `createTab` |
| `activeTabId` | string | `getActiveTabId` (falls back to the first tab), `saveActiveTabId` |
| `passwordHistory` | JSON-encoded `string[]` | `getPasswordHistory`, `savePasswordHistory`, `clearPasswordHistory` |

State management is plain React hooks — no global store.

## Conventions

- ESM throughout (`"type": "module"` in package.json)
- TypeScript strict mode, single quotes, semicolons, no trailing commas (ESLint `comma-dangle`)
- Unused variables must be prefixed with `_`
- Routing via react-router v8; query params track navigation context (e.g., `?back=history`)

## History

A VIA keyboard macro feature (WebHID) was removed after v1.4.0. It is documented for reimplementation in `docs/via-keyboard-macros.md`.
