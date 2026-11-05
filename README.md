# MapleStory Classic Tools

Calculators and simulators for MapleStory Classic World, served at [kevincho.ca/maplestory](https://kevincho.ca/maplestory).

Built with [Next.js](https://nextjs.org) (App Router), React, TypeScript, and Tailwind CSS, deployed on [Vercel](https://vercel.com).

## How it fits together

- **This app is a zone of the kevincho.ca portal** ([`kevin-cho/kevincho.ca`](https://github.com/kevin-cho/kevincho.ca)), using [Next.js Multi-Zones](https://nextjs.org/docs/app/guides/multi-zones). It has its own repo and Vercel project and deploys independently. The portal rewrites `/maplestory` and `/maplestory/*` to it.
- **Everything is served under `basePath: "/maplestory"`** (see `next.config.ts`), including in development.
- **The look and theme match the portal's.** The color tokens, theme script and toggle are copies of the portal's files. On kevincho.ca both apps share the saved light/dark choice.
- **There's no backend.** There's no public API for MapleStory Classic, so the tools run in the browser on built-in game data and what you enter.

## Adding a tool

1. Add an entry to [`src/data/tools.ts`](src/data/tools.ts): `{ slug, name, description }`.
2. Add a page at `src/app/<slug>/page.tsx` (see `src/app/damage/page.tsx`).
3. Add or update its tests in `e2e/`.

The home page lists the tools in the order of `tools.ts`.

## Development

Requires Node 24 (see `.nvmrc`; with nvm, run `nvm use`).

```bash
npm install
npm run dev     # http://localhost:3002/maplestory
npm run build   # production build
npm run lint
```

`localhost:3002/` is a 404: the app only serves under `/maplestory`.

## Tests

End-to-end tests use [Playwright](https://playwright.dev) and live in `e2e/`. They run in headless Chromium against a fresh production build, which Playwright builds and starts on port 3102.

```bash
npx playwright install chromium   # once, downloads the test browser
npm run test:e2e                  # build, start, run the tests
npx playwright test --ui          # step through tests in Playwright's UI
```

Every test also fails if the page logs an error (see `e2e/fixtures.ts`). GitHub Actions runs lint and these tests on every pull request and push to `main`.

## Project layout

- `src/app/` — pages, root layout, global styles (`globals.css` defines the light/dark color roles)
- `src/components/` — UI pieces (header, theme toggle, placeholder page)
- `src/data/tools.ts` — the tools listed on the home page
- `e2e/` — Playwright end-to-end tests
- `docs/plans/` — step-by-step plans and their change logs
