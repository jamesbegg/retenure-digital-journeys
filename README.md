# Retenure digital journeys

The client-facing app for adviser-sent journeys: the annual check-in, follow-ups and pulse checks. One deployment serves every firm, branded per firm and resolved from the hostname.

Start with `AGENTS.md`. It links the architecture canon in `.github/copilot-instructions.md` and the focused rules for components, accessibility, tenancy, journey screens and tests.

Work is tracked in GitHub issues under the digital journeys epic.

## Commands

Node 24 (`nvm use`).

| Command | Runs |
| --- | --- |
| `npm start` | Dev server |
| `npm run lint` | ESLint, stylelint and the journey template check |
| `npm run typecheck` | App and spec types, including templates |
| `npm test` | Unit specs and the guard tests that prove each lint rule |
| `npm run e2e` | Playwright: axe, 320 px with 200% text, tenancy |
| `npm run build` | Production build |
| `npm run format` | Prettier |
