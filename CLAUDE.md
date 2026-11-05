@AGENTS.md

## This app is a zone of kevincho.ca

It's served at `kevincho.ca/maplestory` by the portal repo (`kevin-cho/kevincho.ca`, locally `~/Projects/kevin-cho.github.io`) through Next.js Multi-Zones. Keep it compatible:

- `basePath` stays `/maplestory`. `next/link` adds it automatically, but `next/image` `src` and other raw URLs need it written out.
- Link to portal pages with a plain `<a>`, not `<Link>`. Cross-zone navigation must be a full page load.
- `src/app/globals.css`, `src/components/theme-script.tsx` and `src/components/theme-toggle.tsx` mirror the portal's copies. Change both together.

## Verifying changes

End-to-end tests (Playwright, in `e2e/`) are the default way to check a change; see the README's "Tests" section.

- Run `npm run test:e2e` (with nvm loaded) after each change. It builds the app and tests it on port 3102, so it doesn't touch the `next dev` preview on 3002. A passing run prints a line or two; read the details only when something fails.
- Add or update tests with each feature, in the same step. Import `test` and `expect` from `e2e/fixtures.ts`, which also fails a test on page errors or `console.error`. Tests use full paths (`/maplestory/...`).
- Use the browser pane only to check how new or changed UI looks. Prefer `read_page` over screenshots, and take at most one screenshot per view (e.g. light, dark, phone width).
