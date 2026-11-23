# Repo setup: scaffold, shared UI package, enforced layering, first components

Status: implemented (PRs #40 to #49, awaiting review and merge)
Risk: medium (sets every structural rule later work builds on)
Plan review: done (findings below)

## Scope and non-goals

In scope, one PR each, stacked in this order:

1. **#8 scaffold.** Angular workspace, app, `npm run lint | typecheck | test | e2e | build | format`, ESLint and stylelint rules from the `AGENTS.md` table, journey template check, e2e a11y, zoom and tenancy specs, CI.
2. **#2 `@retenure/ui`.** Library at `projects/ui`, tokens, global styles, layer boundaries, import bans, the spec-and-story check, the story `Variants<C>` type, the gallery.
3. **Components**, each built to its issue: JourneyShell #9, Icon #12, Button #13, Card #10, ActionBar #11, TextField #14, YesNo #17, RadioGroup #15.

Non-goals: journey screens, tenant resolution and theming (#3), the questions engine (#6), publishing the package or wiring the studio to it (a release step), Storybook.

## Acceptance criteria

| ID | Behaviour | PR |
|---|---|---|
| AC-1 | Every check in the enforced-rules table fails on a bad example and passes on the good one. Lint and stylelint guards are proven in `tools/guards.test.mjs` (`node --test`, run by `npm test`) using `lintText`/`codeFilename` with virtual paths, or temp files that are removed afterwards when an import must resolve. Type-level guards are proven with `@ts-expect-error` lines that `npm run typecheck` compiles. | #8, #2 |
| AC-2 | `projects/ui/src/lib` has layers `interfaces` + `utils` (base), `primitives`, `composites`, `layouts`, plus SCSS-only `tokens`. A layer imports its own layer or a lower one, never a higher one (`eslint-plugin-boundaries`). Same-layer import cycles fail (`import-x/no-cycle`). A file outside the known layers fails (`boundaries/no-unknown-files`). | #2 |
| AC-3 | `projects/ui` imports nothing from `src/app` (`no-restricted-imports`). | #2 |
| AC-4 | `src/app/journeys` imports UI only from `@retenure/ui`; no deep path. Journey templates hold only `ret-*` elements and `section, form, h2, h3, p, ul, li` (the shell owns the one `h1`; no `ng-container` or `ng-template`, control-flow blocks are enough). Plain elements take only static attributes, except `form`, which may bind `[formGroup]` and `(ngSubmit)`. Nowhere: a static `style`, `[style*]`, `[ngStyle]`, `[innerHTML]`, `[class*]`, a class starting `ret-`, or an `(input)` or `(change)` handler. Journey templates and styles sit in their own files. Journey SCSS sets only `display, grid*, flex*, gap, row-gap, column-gap, margin*, order`: no custom properties, `::ng-deep`, `@include` or `@extend`. | #8 (template, SCSS), #2 (imports) |
| AC-5 | Every component folder has `<name>.spec.ts` and `<name>.story.ts`. The story is registered in `projects/ui/src/stories.ts` and declares `Variants<X>` where `X` is the class in `<name>.ts`. | #2 |
| AC-6 | `Variants<C>` fails typecheck unless it lists every value of every literal-union input (string unions, and the `kind` of a discriminated object input) and names every boolean input, each with a description. | #2 |
| AC-7 | An `input()`, `input.required()` or `model()` named `variant`, `size`, `tone`, `state`, `kind`, `type`, `layout`, `branding` or `*Position` has an explicit type argument that is not `string`. `@Input` and `@Output` decorators are banned. | #2 |
| AC-8 | Every `interface`, `type` alias and inline object type literal lives in an `interfaces/` folder (specs excepted). | #8 |
| AC-9 | Each component meets its issue's variants, states, accessibility notes and acceptance criteria. Axe passes on its gallery page at default and 200% text. At 320 px wide with 200% text, there is no horizontal scroll and no clipped text. 200% text sets `html { font-size: 200% }` so every `rem` scales: e2e injects it, and the gallery's `?text=200` does the same for people. | component PRs |
| AC-10 | The production build has no gallery code and no synthetic firm name (`tools/check-dist.mjs`, run by `npm run build`). | #2 |
| AC-11 | CI runs lint, typecheck, unit, guards, build and e2e on every PR. | #8 |
| AC-12 | The `AGENTS.md` table lists each new rule with its real enforcement. The canon's paths and Angular version match the code. | #8, #2 |

## Structure

```text
projects/ui/src/
  public-api.ts            components and interfaces, listed explicitly
  stories.ts               story registry for the gallery (alias @retenure/ui/stories, never in public-api)
  styles/index.scss        tokens + reset + base + utilities (global, built once)
  lib/
    tokens/                CSS custom properties (neutral, light and dark, brand slots) and SCSS mixins
    interfaces/            every type: <component>.ts, story.ts
    utils/                 nextId, provideValueAccessor
    primitives/<name>/     icon, button, text-field, yes-no, radio-group
    composites/<name>/     card, action-bar
    layouts/<name>/        journey-shell
src/app/
  interfaces/              app types
  journeys/                empty until a journey is approved
  gallery/                 dev-only stories page
  dev-routes.ts            gallery route; replaced by dev-routes.prod.ts (empty) in production
tools/                     check scripts and guards.test.mjs
e2e/                       a11y, zoom, tenancy specs and synthetic firm fixtures
```

Each component folder holds `<name>.ts`, `.html`, `.scss`, `.spec.ts`, `.story.ts`. Angular 22 file naming, class names without a suffix (`Button`). `@retenure/ui` maps only to `public-api.ts`; `@retenure/ui/stories` maps only to `stories.ts`. There are no wildcard paths.

## Existing patterns reused

No code exists yet. Patterns come from the canon: standalone components, `input()` and `output()` signals, `ControlValueAccessor`, discriminated unions on `kind`, exhaustive `never` checks, `rem` sizing, the input naming table in `components.instructions.md`, and the synthetic firms in `docs/agentic-memory.md`.

## Interfaces and data flow

- `Variants<C>` (`interfaces/story.ts`) is a mapped type over `C`'s inputs:
  - a string-union input becomes `Record<value, description>`
  - an object input discriminated on `kind` becomes `Record<kind, description>`
  - a boolean input becomes a `description`
  
  Missing or extra keys fail typecheck. The story renders an example for each entry.
- Slots: `<ng-content select="[slot=name]">` in every component, so `<ret-action-bar slot="actions">` reads the same everywhere. Angular still creates projected content when its slot is hidden, so a slotted component does no work in its constructor, and a caller does not project a firm header into a neutral shell.
- Global styles, built once:
  - tokens and reset
  - base typography at `1.0625rem` with line height 1.5
  - one `:focus-visible` ring for every focusable element
  - `.ret-visually-hidden`
  
  The card surface is a `surface` mixin in `tokens/`, used by Card and standalone YesNo. It is not a global class, so a screen cannot rebuild a card.
- Form controls implement `ControlValueAccessor`:
  - TextField: value is a `string`, and `type` is fixed for a field's lifetime. Money is digits with no separators, rounded to pence on blur; text it cannot read passes through as typed so the screen can show an error. A date is a real `YYYY-MM-DD` once complete, otherwise `''`, and the control also implements `Validator`, returning `{ incompleteDate: { missing: ('day' | 'month' | 'year')[] } }` or `{ invalidDate: true }`. Autocomplete is set by the caller (`email`, `tel`, `bday` for a date), never assumed, because a partner's details must not autofill with the client's own.
  - YesNo: `{ value: boolean; detail?: string } | null`. With a `detail` input (`{ when, label }`), choosing that answer reveals a multi-line TextField; the detail is sent only while the box shows (the typed text stays as a draft, so a mis-tap does not lose it), a stored detail loads only under its own answer, and an empty detail is left out. Like TextField's `type`, `detail` is fixed for the control's lifetime.
  - RadioGroup: `{ value: string; input?: string } | null`.
- JourneyShell: `layout: 'default' | 'with-steps' | 'centred'`, `state: 'loading' | 'ready' | 'error' | 'blocked'`. The shell holds no branding switch: the firm's theme and details are applied once at start-up from the backend, and a page that could not load them (the generic error page) simply projects no firm header or contact. Empty header and contact landmarks are not rendered.
- ActionBar takes `actions: ActionBarActions`, a union on `kind`:
  - `single { primary }`
  - `pair { secondary, primary }`
  - `edit { cancel, save }`, rendered as a pair whose fields name the edit semantics
  
  Each kind takes an optional `link`, which is the issue's `with-link` variant. Outputs are `primaryPressed`, `secondaryPressed` and `linkPressed`. The primary is `type="submit"`. Inputs are `pending` and `hidden`.

## Security and ownership boundaries

No tenant data, network calls or storage in this work. Components hold no firm values. Brand reaches them only through `--ret-brand-*` tokens, which #3 sets.

The gallery and its synthetic names are kept out of production in two ways:

- `fileReplacements` swaps `dev-routes.ts` for an empty array, so the gallery is never compiled.
- `check-dist.mjs` fails the build if the gallery or a synthetic firm name appears in `dist`.

E2E runs against `ng serve` (development configuration) with `allowedHosts: ['.localhost']`. The tenancy spec defines the two synthetic firms and their hosts. It is `test.fixme` until #3, because before branding exists it would pass on an empty page. The `AGENTS.md` tenant-id row stays planned.

## Invariants and failure semantics

| Invariant | Enforced by |
|---|---|
| No upward layer import; no unknown file in `lib/` | `boundaries/dependencies`, `boundaries/no-unknown-files` |
| No import cycle | `import-x/no-cycle` |
| UI never imports app | `no-restricted-imports` on `projects/ui/**` |
| Journeys import UI only through `@retenure/ui` | `no-restricted-imports` on `src/app/journeys/**` |
| Journey template allowlist and bindings | `tools/check-journey-templates.mjs` (Angular `parseTemplate`) |
| Journey templates and styles in their own files | `@angular-eslint/component-max-inline-declarations` (0) on journeys |
| Journey SCSS layout-only | stylelint override |
| Spec, story, registry and `Variants<OwnClass>` per component | `tools/check-ui-files.mjs` |
| Story covers every variant | `Variants<C>` in `npm run typecheck` |
| Types only in `interfaces/` | ESLint `no-restricted-syntax` |
| Variant inputs are literal unions; no decorators | ESLint `no-restricted-syntax` |
| No gallery or synthetic firm in production | `fileReplacements`, `tools/check-dist.mjs` |

Each check's error message names the fix.

## Dependency graph and implementation waves

Strictly linear, because every PR touches `public-api.ts`, `stories.ts` or shared config: #8 → #2 → JourneyShell → Icon → Button → Card → ActionBar → TextField → YesNo → RadioGroup. Each PR is based on the one before it. There is a single writer (the parent), because every unit edits shared files.

## Change budget

- #8: about 25 config and tooling files. #2: about 25. Each component: 5 files plus its registry, public-API and guard lines.
- Production dependencies: Angular and `lucide` (framework-free icon data; `lucide-angular` does not support Angular 22). Dev dependencies include `eslint-plugin-boundaries`, `eslint-plugin-import-x`, `@testing-library/angular`, Playwright and axe.

Replan if any of these become necessary:

- a further production dependency
- a new layer
- a change to `Variants<C>` or the slot convention
- a component not listed above

## Verification

Per PR:

- `npm run lint`, `typecheck`, `test` (unit and guards), `build`, `e2e` and `format`
- `verify-change`, with `reviewer`, `test-reviewer` and, for rendered changes, `accessibility-reviewer`

The PR description shows each new guard failing on its bad example, then passing.

## Compatibility and rollout

Nothing is live. The package is consumed through a `tsconfig` path in this repo. Publishing it for the studio is a release step that waits for the user. When the studio adopts it, `styles/index.scss` brings a global reset and base typography, so the studio either takes the whole stylesheet or only `tokens/`.

## Decisions

### Confirmed by the user

- Layers, import bans, journey restrictions, the spec-and-story check, literal unions, one PR per issue, the stop points.
- Strict KISS; build global things once; types always in `interfaces/`.

### Derived from repository conventions

- `ret` prefix, `rem` sizing, CVA for controls, `adviser` spelling, synthetic firms only.
- **Journey templates allow `h2` and `h3` but not `h1`.** The brief lists h1 to h3, but #9 and the accessibility canon say the shell sets the screen's one `h1` from an input, so a template `h1` would make two.

### Safely inferred (reversible, flagged to the user)

- **Angular 22, not 20.** The canon names Angular 20, which reaches end of life this month, and 22.3 is current. The canon is updated in #8.
- **Same-layer imports allowed, upward banned, cycles banned.** The brief says "only from layers below", but the issues need Button → Icon and RadioGroup → TextField, which are all primitives.
- **`interfaces` and `utils` form a base layer** below primitives.
- **Icon (#12) and Button come before Card and ActionBar.** Card's answered state uses both, and ActionBar uses Button.
- **Stories are typed Angular components on a dev-only gallery route**, not Storybook.
- **Paths move from `src/app/ui` and `src/app/models` to `projects/ui/src/lib` and `interfaces/`.** The canon is updated.
- **YesNo's "No closes follow-ups" belongs to QuestionCard (#35)**, which owns follow-ups. YesNo emits the value.
- **Money shows a `£` prefix**, as the issue specifies.

### Replans

- **FieldMessages (internal primitive), added with YesNo.** TextField, YesNo and RadioGroup each need the same hint, error and always-present live region. Building it once beats three copies. It has a spec and a story like any component, is not exported from `public-api.ts`, and `utils/described-by.ts` builds the matching `aria-describedby`.
- **Story layout is global.** `.ret-stack` and `.ret-cluster` in `projects/ui/src/styles/_utilities.scss` replace a stylesheet per story; the gallery frame gives the padding. Journey templates still cannot use `ret-*` classes.

- **Shared validators, added to #49 at the user's request.** `utils/validators.ts`: `emailAddress`, `ukPhone`, `personName`, `dateOfBirth(minAge, maxAge)` and `moneyAmount(min, max)`. Light-touch checks that catch slips (a name in the email field, 1196 for 1996), not strict formats. Empty values pass so `Validators.required` decides; error copy comes from each question definition.
- **YesNo detail box (2026-11-22, user request via the backend lane).** YesNo's value moves from `boolean | null` to `{ value: boolean; detail?: string } | null`, matching RadioGroup's `{ value, input? }` and the wire answer `{ kind: 'yesNo', value, detail? }`. Nothing was live, so the story and spec moved in the same change. `detailError` puts an error on the box, as RadioGroup's `optionErrors` does.

### Unresolved and blocking

None.

### Unresolved and non-blocking

- Publishing `@retenure/ui` for the studio (a release decision).

## Plan review findings

| # | Finding | Resolution |
|---|---|---|
| 1 | Blocker: Angular 22, same-layer imports and the new order are user decisions. | Rejected as blocking. Each is reversible before dependent code exists. Angular 20 is end-of-life, so building on it is the larger risk. Same-layer imports are needed by the issues the user called the agreed design; cycles are now banned. The order follows component dependencies. All three are flagged in the handoff. |
| 2 | Blocker: a 200% wrapper does not scale `rem`. | Accepted. `?text=200` sets the root font size (AC-9). |
| 3 | `Variants` misses booleans and doesn't check the class. | Accepted. Booleans are included (AC-6); `check-ui-files` matches the class (AC-5). The record value stays a description: examples are rendered by hand, because composites need projected content. |
| 4 | Journey SCSS holes. | Accepted: custom properties, `::ng-deep`, `@include` and `@extend` are banned. |
| 5 | Journey template holes. | Accepted: binding and attribute restrictions (AC-4), and the surface is a mixin, not a global class. |
| 6 | Shell and ActionBar unions force rework. | Accepted: `layout` and `branding` are split, the link is optional on every kind, outputs are defined. |
| 7 | Gallery may reach production. | Accepted: `fileReplacements` and `check-dist.mjs` (AC-10). |
| 8 | The tenancy spec passes on an empty page. | Accepted: `test.fixme` until #3. |
| 9 | h1 conflict. | Accepted: journeys allow `h2` and `h3` only. |
| 10 | Literal-union lint is easy to slip past. | Accepted: covers `model()`, `input.required`, bans decorators and inline type literals. Rejected: mapping `string` to `never` inside `Variants`, because AC-7 already fails that case at lint, and a second guard adds nothing. |
| 11 | A partial date is indistinguishable from an empty one. | Accepted: TextField implements `Validator` for date. |
| 12 | How type-level guards are proven; unknown files. | Accepted: `@ts-expect-error` lines, `no-unknown-files`. |
| 13 | Global styles would restyle the studio. | Accepted: noted under rollout. |

## Implementation readiness

- [x] Every acceptance criterion has an owning PR.
- [x] Every invariant has an enforcement location.
- [x] No externally visible behaviour exists yet to keep compatible.
- [x] Safety and data boundaries are defined (no tenant data; gallery out of production).
- [x] Component states come from each issue.
- [x] Single writer, linear stack, so no ownership conflicts.
- [x] Shared contracts (`Variants`, slots, tokens) land in #2, before any component. `utils/` (`nextId`, `provideValueAccessor`) and the `surface` mixin land with their first user (TextField and Card), so #2 adds no unused code.
- [x] Material failures map to guards, specs or e2e.
- [x] No unresolved decision can invalidate work underway.

## Outcome review

| Metric | Result | Evidence |
|---|---|---|
| Planned versus actual work units and files | 10 PRs as planned, plus Icon (#12) before Button and one internal primitive (FieldMessages) | PRs #40 to #49 |
| Agents used | 1 plan review; 3 reviews per component PR (code, test, accessibility); 2 to 3 for #8 and #2 | PR descriptions |
| Accepted review findings | Most "act on" findings across all PRs, each fixed before its PR opened | PR descriptions |
| Rejected review findings | Blocker classification of the safely inferred decisions; `pendingLabel` and other neutral default copy (canon allows it); steps shown in every shell state; mapping `string` inputs to `never` in `Variants` | Plan review table, PR #44, PR #42 |
| Verification failures by classification | Regressions caught before push: host-class collision (Button/Icon), e2e checking unrendered pages, long-word overflow on CI's Linux fonts (#44), an emptied gallery template (caught by e2e), a guard test that deleted `interfaces/` (now sandboxed) | PR #44, #41, #48 descriptions |
| Replans | FieldMessages; global story layout utilities; host variants as data attributes (new lint rule) | Replans section, AGENTS.md |
| Ownership conflicts | None (single writer, linear stack) | — |
| Human decisions | Angular 22 instead of 20; same-layer imports; component order; card accent bar and card headings versus journey-ux; neutral default copy versus localisation; native `disabled` versus `aria-disabled` | Decisions section, PR descriptions |
| Residual risks | The zoom e2e does not catch content spilling outside its own container within the viewport; a `string` type alias slips past the variant-input rule; tokens and styles are not yet packaged for the studio | PR #48, #41 |
| Post-completion defects | Unknown at completion | Update when known |

