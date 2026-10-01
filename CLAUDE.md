# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Chrome extension (Manifest V3) for generating random passwords using word lists via the `@rolandwarburton/pwgen` npm package. Provides password generation, tabbed password lists, history, QR codes, and clipboard copy. The popup holds the main UI; the side panel holds settings.

## Build & Lint

```bash
npm run build    # node build.js — esbuild bundle: src/{index,sidepanel}.tsx → dist/, plus copies manifest.json, static/{popup,sidepanel}.html, images/
npm run lint     # ESLint on src/ and build.js
npm run release  # scripts/release.js — builds, zips dist/, publishes a GitHub release via `gh` (does NOT bump the version)
```

- Version bumps are done with the `/bump-version` skill (`.claude/skills/bump-version/`), which updates `package.json`, `manifest.json`, and the `TAG`/`RELEASE_NAME`/`RELEASE_NOTES` constants in `scripts/release.js`.
- The esbuild build does not type-check. Use `npx tsc --noEmit -p .` for that.
- Load `/dist` as an unpacked extension in `chrome://extensions/`. No dev server — rebuild and reload the extension manually.
- `build.js` copies static files one by one, so a new file in `static/` must also be added there.

## Architecture

- **Entry points**: `src/index.tsx` (popup, routes `*` → app, `/settings`, `/history`, `/qr/:param`, `/generator`) and `src/sidepanel.tsx` (side panel, renders only Settings). Both use `createHashRouter` + Goober CSS-in-JS (`setup(React.createElement)`).
- **Pages**: `src/pages/{app,generator,settings,history,qr}/` — each page loads its own data from Chrome storage. The popup's Settings button opens the side panel (`chrome.sidePanel.open`) and closes the popup.
- **Shared components**: `src/components/` — `password-row/` (list item with actions), `tabs/` (password list tabs), `icons/` (inline SVG), `styles/` (Goober styled components)
- **Static files**: `static/` — `popup.html`, `sidepanel.html`
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
