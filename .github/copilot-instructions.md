# Digital journeys architecture and contribution canon (Retenure)

This file is the source of truth for how to build and change the client journeys app. If a pattern changes, update this file first. Keep it architectural. Folder-specific guidance lives in `.github/instructions/`:

- `components.instructions.md`: the shared, configurable component library.
- `accessibility.instructions.md`: WCAG 2.2 AA and font scaling.
- `tenancy.instructions.md`: firm resolution, branding and isolation.
- `journey-ux.instructions.md`: screen patterns, copy and question controls.
- `testing.instructions.md`: tests.

Never run deploy, DNS or certificate commands unless the user's current request contains the exact phrase `DEPLOY NOW`. `AGENTS.md` holds the full safety boundary.

## 1) Architecture

- **App**: Angular 20, standalone components, signals for local state, typed reactive forms for every control, lazy-loaded routes by journey. No NgRx without an ADR.
- **Styling**: SCSS with design tokens exposed as CSS custom properties. The tenant theme sets the brand tokens at runtime; components read tokens and never hold brand values.
- **Shared UI**: the components in `src/app/ui/` are the only building blocks a journey screen uses. They are written to move into a shared package (`@retenure/ui`) that the adviser studio also consumes for previews, so they import nothing from journeys, routes or services.
- **Backend**: `my-wealth-backend` owns tenants, journeys, question sets, answers and client verification. This app holds no business rules that decide what to ask; it renders what the questions engine returns.
- **Hosting**: one deployment serves every firm. The firm is resolved from the hostname (`<firm>.retenure.io`, or a firm's own domain that points a CNAME at the shared custom-domain target). There is no per-firm build.

### Request flow

1. The browser loads the app shell on a firm hostname.
2. `TenantResolver` reads `location.hostname`, calls the public tenant endpoint once, and receives the tenant id, theme and display settings. An unknown host shows the neutral not-found page with no firm branding.
3. The tenant theme is applied to `:root` before the first journey screen renders.
4. The client verifies (code or knowledge check, set by the firm). The session is bound to the tenant id and the journey invitation.
5. The journey route loads the journey definition and the questions engine output for this client and renders it with shared components.
6. Answers save per card as drafts, scoped to tenant, journey and invitation, and submit once at the end.

## 2) Project structure

- `src/app/ui/`: shared components, one folder each (`button/`, `radio-group/`), with spec and story. No feature imports.
- `src/app/tenant/`: hostname resolution, theme application, tenant-scoped HTTP interceptor.
- `src/app/journeys/<journey>/`: one lazy route per journey. Screens compose `ui/` components and the journey renderer.
- `src/app/engine/`: the client-side journey renderer that maps a question definition to a component. It does not decide which questions to ask.
- `src/app/models/`: exported types for tenants, journeys, questions and answers. Do not export interfaces from components or services.
- `src/styles/`: tokens, typography scale, reset. The only place a raw colour or size value may appear.

## 3) KISS and types

- Build the simplest version that meets the contract. Add no tier, flag, guard, abstraction, option or machinery the contract did not ask for. Before finishing a unit, read your diff for anything you could delete and delete it.
- Model variants as discriminated unions on one literal field (`kind: 'yesNo' | 'radio' | 'text'`), not as a bag of optional fields.
- External data is untyped until parsed: API responses and query parameters are parsed at the boundary into a `models/` type.
- Exhaust unions with `const _exhaustive: never = value;` so a new question type fails compilation where it needs a component.
- No base classes for components or services, no barrel-file sprawl, no `any` without a documented reason.

## 4) Components

Every component is configurable and globally reusable. See `components.instructions.md` for the full rules. In short: typed inputs for content, variant and state; outputs for events; no knowledge of the journey, screen or firm; brand through tokens only; every variant has a spec and a story; a second need becomes a variant, never a copy.

## 5) Tenancy

The tenant id is the outermost scope of everything. See `tenancy.instructions.md`. In short: resolved once from the hostname, never from a query parameter or stored value; every API call, cache key, storage key and asset URL carries it; an error never falls back to another firm's theme.

## 6) Questions

The questions engine in the backend selects and orders questions for a client. This app renders its output. A question definition carries its `kind`, copy, options, conditions for follow-ups and the held data it confirms. The renderer maps each `kind` to one shared component. Adding a question type means adding a `kind`, a component variant if needed, and the renderer case, in one change.

## 7) Accessibility

WCAG 2.2 AA is the floor, with extra care for older clients. See `accessibility.instructions.md`. Font scaling and zoom are tested on every screen, not assumed.

## 8) Privacy and logging

- Client answers are sensitive. Never log answer values, free text, names, emails or dates of birth. Log ids and outcomes.
- No third-party analytics, fonts or scripts on journey pages without an ADR. Self-host fonts and icons.
- Drafts in browser storage are scoped to tenant and invitation, hold the minimum needed, and are cleared on submit and on sign-out.

## 9) Errors

- Every screen has loading, empty, error and blocked states. An error message tells the client what to do next and how to reach their adviser, never a code or stack.
- An expired or used invitation shows a calm page with the adviser's contact route (email first).

## Repo-local memory

Record only operational lessons, rejected approaches and recurring failure modes in `docs/agentic-memory.md`.
