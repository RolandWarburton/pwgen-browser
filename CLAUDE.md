# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Chrome extension (Manifest V3) for generating random passwords using word lists via the `@rolandwarburton/pwgen` npm package. Provides password generation, storage, history, QR codes, clipboard features, and HID device pairing in both a popup and a side panel.

## Build & Lint

```bash
npm run build    # esbuild bundle: src/{index,sidepanel}.tsx → dist/ (also copies manifest.json, static/, images/)
npm run lint     # ESLint on src/ and build.js
npm run release  # scripts/release.js — version bump + packaging
node build.js    # Direct build invocation
```

Load `/dist` as an unpacked extension in `chrome://extensions/`. No dev server — rebuild and reload the extension manually.

## Architecture

- **Entry points**: `src/index.tsx` (popup) and `src/sidepanel.tsx` (side panel) — both use React router + Goober CSS-in-JS
- **Pages**: `src/pages/{app,generator,settings,history,qr}/` — each page handles its own data fetching from Chrome storage
- **Shared components**: `src/components/` — `password-row/` (list item with actions), `icons/` (inline SVG), `styles/` (Goober styled components)
- **Static files**: `static/` — `popup.html`, `sidepanel.html`, `pair.html` + `pair.js` (HID device pairing page)
- **Types**: `src/types/index.ts` — `ISettings` and `IPassword` interfaces
- **Build config**: `build.js` — esbuild with ESM format, automatic JSX, TypeScript path aliases (`@/*` → `src/`)

## Data Layer

All persistence via `chrome.storage.local` with keys: `settings`, `passwords`, `passwordHistory`. Storage helper functions (`getSettings`, `getPasswords`, `getPasswordHistory`) are defined in `src/pages/settings/index.tsx` and used across pages; they return defaults when no data exists.

State management is plain React hooks — no global store.

## Conventions

- ESM throughout (`"type": "module"` in package.json)
- TypeScript strict mode, single quotes, semicolons required
- Unused variables must be prefixed with `_`
- Routing via react-router-dom v6; query params track navigation context (e.g., `?back=history`)
