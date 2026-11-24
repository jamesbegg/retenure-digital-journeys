# Retenure digital journeys agent instructions

## Product context

This repository is the client-facing app for Retenure digital journeys: the annual check-in, follow-ups, pulse checks and later journeys a client completes for their adviser. Each journey is sent by the adviser, shows the adviser's firm branding, and runs on that firm's own address.

It exists to:

- let a client confirm what their adviser holds, tell them what has changed, and answer the adviser's questions in a few minutes
- give advisers structured, auditable answers they can act on
- let a firm build its own journeys from a shared, configurable component and question library

It is not:

- the adviser studio (`my-wealth-advisor-studio`), which is where advisers review and approve
- an advice engine. Nothing here gives advice or replaces the adviser. The adviser decides what is asked and what happens next.
- a place for one firm's special cases in shared code

## Three rules that override convenience

1. **Every component is configurable and globally reusable.** A component takes its content, variant and state through typed inputs and works in every journey, every firm and the studio preview. No component knows which journey, screen or firm it is in. If a second screen needs a slightly different version, add a typed variant to the shared component; never fork or copy it.
2. **WCAG 2.2 AA, with real font scaling.** Many clients are older. Every screen works at 200% browser zoom and at 200% text-only scaling, reflows at 320 CSS px with no horizontal scroll, and has 44 x 44 px targets for primary controls. Sizes are in `rem`, never fixed `px` for text or text containers. See `.github/instructions/accessibility.instructions.md`.
3. **No cross-firm data or branding, ever.** The tenant is resolved once from the hostname and every request, cache key, asset URL, log line and anything stored is scoped to it. A firm's name, logo, colours or copy must never render for another firm's client, including in error pages, emails and cached shells. See `.github/instructions/tenancy.instructions.md`.

## Sources of truth

Before changing code, read `.github/copilot-instructions.md`. It is the architecture and contribution canon for this repository and must be followed directly.

Load the focused guidance that matches the work:

- Shared components: `.github/instructions/components.instructions.md`
- Accessibility and font scaling: `.github/instructions/accessibility.instructions.md`
- Firm isolation, hostnames and branding: `.github/instructions/tenancy.instructions.md`
- Journey screens, copy and question patterns: `.github/instructions/journey-ux.instructions.md`
- Tests: `.github/instructions/testing.instructions.md`

Repository skills live in `.claude/skills/`. `.agents/skills` is a symlink to it so Codex reads the same files.

- `plan-feature`: plan non-trivial or cross-cutting work and write the feature contract.
- `verify-change`: verify a finished change before handoff, including the accessibility and tenant checks.
- `blast-radius`: find what a small-looking change could break elsewhere, and prove the fact it is safe because of by running code.
- `correct`: turn a mistake agents keep repeating into an architecture, type, lint or test guard.
- `unslop`: remove AI writing patterns from contracts, docs, PR descriptions and commit messages.
- `form-design`: design or review any form, question, Check your answers or adviser approval summary: questions, then flow (progressive disclosure first), then look.

Feature contracts live in `docs/features/`. Use `docs/agentic-memory.md` only for stable lessons that are not already clearer in the canon.

Do not duplicate or override the canon in a new document. When implementation and documentation disagree, inspect the code and surface the discrepancy before choosing a new pattern.

## Safety boundary

- Never execute a deploy, release, DNS change, certificate change, or cloud mutation unless the user's current request contains the exact phrase `DEPLOY NOW`.
- Without that phrase, cloud work is limited to inspection, local validation and patch preparation.
- Never use real client, household or firm data in fixtures, screenshots, mockups, stories or tests. Use synthetic data and the fictional demo firms in `docs/agentic-memory.md`.
- Never expose or commit credentials, tokens, `.env` values or sensitive logs.
- Preserve unrelated working-tree changes. Do not reset, discard or rewrite user changes.

## Working rules

- Start from the client's task and the adviser's decision, not the component tree.
- Understand the existing execution path and inspect the closest analogue before editing.
- Prefer existing components and explicit code over speculative abstractions. Before adding a component, search the shared library; before adding a variant, check whether an existing variant already covers it.
- Keep changes scoped to the requested behaviour.
- Nothing is live yet. Migrate every caller and delete the old path instead of keeping compatibility shims. Coordinate a breaking API change with the backend in the same piece of work. Revisit this rule at launch.
- Do not weaken typing, validation, accessibility, tenant isolation or privacy.
- Do not add a production dependency unless the task requires it and the trade-off is explicit.
- Write "adviser", not "advisor", in copy, comments and new identifiers. Existing backend identifiers keep their spelling.

## Multi-agent operating model

Claude Code is the primary harness. Codex reads the same `AGENTS.md`, the same skills through `.agents/skills`, and its own role mirror in `.codex/agents`.

Each role's model is in `.claude/agents/README.md`. Spawn a named role without a model override, so `reviewer`, `security-reviewer`, `accessibility-reviewer` and `plan-reviewer` always run on Opus.

Prefer the lowest-cost model that reliably fits the work. Parallel work is for genuinely independent tasks, not for splitting one tightly coupled edit across several writers. Give each delegated agent a bounded question, minimal relevant context and a concise output target. Reuse completed discovery instead of asking another agent to rediscover the same path.

For non-trivial features, cross-cutting refactors, unfamiliar failures or security-sensitive work:

1. Invoke the `plan-feature` skill and delegate independent read-only discovery to `mapper` agents where useful.
2. Draft a concise feature contract from the confirmed scope and discovery results.
3. For UI work, pass the design gate below.
4. Have `plan-reviewer` challenge the exact draft before implementation. The parent resolves findings, finalises the contract and remains the architectural authority.
5. Delegate only disjoint implementation units to `implementer` agents. Sequence work that touches shared components, tokens or interfaces.
6. Run `reviewer`, `test-reviewer`, `accessibility-reviewer` for any rendered change, and `security-reviewer` when a trust boundary is affected, in parallel after integration. 
7. Synthesise findings, reject unsupported suggestions, fix confirmed issues, and invoke `verify-change` before completion.
8. When a non-trivial PR is ready for review or merge, run the `codex-review` loop (docs-only, tooling-copy and tiny PRs skip it; see the skill): Codex posts a public review, you triage it with the KISS filter, fix what is real and repeat until nothing survives triage, at most three rounds.

For small local changes that do not need a concrete plan, the parent handles the work directly. The primary agent owns architecture, integration, conflict resolution and the final answer.

## Design gate

Non-trivial UI work gets a visible low-fidelity layout before any template, component or style code is written: map, contract, layout options, plan review, the user picks, implement, rendered review.

- A change is trivial only if it alters none of: layout, regions, the primary action, the set of states, or a flow. Copy that changes what the client decides or does next is not trivial. State the triviality call aloud.
- Mockups are self-contained static HTML with synthetic data and existing tokens. They never live under `src/` and are never committed.
- No implementation begins before the user has seen the mockups when there is more than one option.

## Git

- Branch from `develop`, the default branch and the base for every PR. CI runs on PRs to `develop` and on pushes to it. `main` holds released code. Work in a worktree when other sessions share the checkout.
- Stage explicit paths. Never use `git commit -a` or `git add -A`, because other sessions may be editing the same checkout.
- Use Conventional Commits titles (`type(scope): subject`) and push the branch after every commit.
- Before creating a PR, run `npm run format` and inspect the resulting diff.

## Bug fixes

1. Reproduce the bug before changing code. When a cheap local test path exists, write the failing spec first and confirm it fails for the reported reason.
2. Trace the path (route, tenant resolution, journey state, question engine output, component inputs, API call) and find the root cause. Add logging and read it rather than guessing.
3. Fix the cause, not the symptom. A guard that hides an error is not a fix. Search for the same pattern elsewhere and fix every instance.
4. When two fixes that share one assumption have both failed, write that assumption down and test it before a third attempt.
5. Commit the failing spec before or with the fix, and report the failing and passing output.

## Cross-repo features

Implement a feature that spans repositories in this order: `my-wealth-backend` (tenant, journey, question and answer APIs), then this repository, then `my-wealth-advisor-studio` (the builder and approval screens). Shared UI and tokens change in the shared package first, then each app picks up the new version. Read each repository's own `AGENTS.md` before editing it.

## Plugin skills

This file and the repository skills take precedence over any process skill a plugin injects. When a plugin skill covers the same step, use the repository path instead:

| Step                  | Use                                                              | Not                                                                                      |
| --------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Planning and design   | `plan-feature` and the design gate                               | superpowers `brainstorming`, `writing-plans`, `executing-plans`                          |
| Delegation            | the operating model above and `.claude/agents`                   | superpowers `subagent-driven-development`, `dispatching-parallel-agents`                 |
| Bugs and tests        | Bug fixes above, `.github/instructions/testing.instructions.md`  | superpowers `systematic-debugging`, `test-driven-development`                            |
| Review and completion | `verify-change`                                                  | superpowers `requesting-code-review`, `receiving-code-review`, `verification-before-completion` |
| Branches              | Git above                                                        | superpowers `using-git-worktrees`, `finishing-a-development-branch`                      |

## Planning threshold

Create or update `docs/features/<feature>.md` before implementation when work changes tenant resolution or branding, authentication or client verification, the questions engine or question library, a shared component's inputs, journey state or persistence, public API contracts, or several independently owned areas.

The contract stays concise and includes scope, existing patterns reused, interfaces, invariants, dependency order, file ownership, verification, rollout concerns and unresolved product decisions. Classify decisions as confirmed, derived from repository conventions, safely inferred, unresolved and blocking, or unresolved and non-blocking.

Do not release implementation work until the contract passes the implementation-readiness gate in the `plan-feature` skill. This is not a mandatory user checkpoint, except for the design gate.

## Verification

Use targeted checks while iterating and the full set at completion:

- `npm run lint` (ESLint and stylelint)
- `npm run typecheck`
- `npm test`
- `npm run e2e` (Playwright, including the axe and zoom specs)
- `npm run build`

Until a script exists, report it as not run with the reason. Never describe a missing check as passing. Do not claim completion with failing checks. State pre-existing or environment-related failures separately from failures caused by the change.

## Code review rules

Review for correctness, tenant isolation, accessibility, component reuse (a forked or one-off component is a finding), state and error handling, privacy of client answers, and missing behavioural tests. Ignore style-only concerns already enforced by tooling.

## Enforced rules

Each rule pairs with what enforces it. When the user corrects an agent, fix the mistake and add the rule here. A rule marked "judgment" has no check yet; if it is broken twice, run the `correct` skill to move it up to a structural guard. "Planned" names the guard to add when the app is scaffolded.

| Rule | Enforced by |
| --- | --- |
| Stage explicit paths. Never `git commit -a`, `git add -A`, `git add -u` or `git add .`. | `.claude/hooks/bash-guard.sh` |
| Screens compose shared components from the UI library. A screen never defines its own button, field, radio, card or notice. | `tools/check-journey-templates.mjs` (below) |
| Journey templates use only `ret-*` elements and `section`, `form`, `h2`, `h3`, `p`, `ul`, `li` (the shell owns the `h1`). No `ng-container`, `ng-template` or structural directive. Plain elements take static attributes only, except `form` with `[formGroup]` and `(ngSubmit)`. No `style`, `[style]`, `[class]`, `[ngStyle]`, `[innerHTML]` or `ret-*` class anywhere. | `tools/check-journey-templates.mjs` in `npm run lint` |
| Styles live in `.scss` files, never inline, so stylelint sees them. Journey templates also live in their own files. Journey components set no `host` metadata, `@HostBinding` or `@HostListener`. | `@angular-eslint/component-max-inline-declarations`; ESLint `no-restricted-syntax` on `src/app/journeys` |
| No inline `eslint-disable` or `stylelint-disable`. A rule that needs an exception changes in config, with a reason. | ESLint `noInlineConfig`, stylelint `ignoreDisables` |
| Journey SCSS sets layout only (`display`, `grid*`, `flex*`, `gap`, `margin*`, `order`): no colour, border, font, radius, shadow, custom property, `::ng-deep`, mixin or import. | stylelint override for `src/app/journeys/**/*.scss` |
| Every type (`interface`, `type`, `enum`, inline object type) lives in an `interfaces/` folder. | ESLint `no-restricted-syntax` (specs excepted) |
| UI layers in `projects/ui/src/lib`: `interfaces` and `utils`, then `primitives`, `composites`, `layouts`. A layer imports its own layer or a lower one, never a higher one. No import cycles. No file outside a known layer. | `boundaries/dependencies`, `boundaries/no-unknown-files`, `import-x/no-cycle` |
| `projects/ui` imports nothing from `src/app` and never imports itself by package name. | ESLint `no-restricted-imports` on `projects/ui` |
| App code imports UI only from `@retenure/ui`, never a deep path. Only the gallery imports `@retenure/ui/stories`. | ESLint `no-restricted-imports` on `src/app` |
| Every component folder has `<name>.spec.ts` and `<name>.story.ts`. The story declares `Variants<Component>` and is registered in `projects/ui/src/stories.ts`. | `tools/check-ui-files.mjs` in `npm run lint` |
| A story lists every value of every literal-union input, every `kind` and every boolean input. | the `Variants<C>` type, run by `npm run typecheck`; proven by `@ts-expect-error` lines in `interfaces/story.spec.ts` |
| Inputs named `variant`, `size`, `tone`, `state`, `kind`, `type`, `layout`, `branding` or `*Position` take a literal-union type argument, never `string`. Signals only: no `@Input` or `@Output`. | ESLint `no-restricted-syntax` |
| UI components put host variants in data attributes (`[attr.data-size]`, `:host([data-size='lg'])`), never host classes, so a parent's `.md` style cannot match a child's host. | ESLint `no-restricted-syntax` and stylelint `selector-disallowed-list` on `projects/ui` |
| The production build contains no gallery and no synthetic firm or household name. | `fileReplacements` for `src/app/dev-routes.ts`; `tools/check-dist.mjs` in `npm run build` |
| Components take content through inputs. No firm name, journey name, client name or screen-specific copy inside a shared component. | judgment; planned: lint check for hard-coded copy in `ui/` templates |
| No firm branding outside the tenant theme: no colour literal, logo path or firm name in components or screens. | stylelint `color-no-hex`, `color-named` and `function-disallowed-list` outside `projects/ui/src/lib/tokens`; logo paths and firm names are judgment |
| Every tenant-scoped request, cache key and anything stored includes the tenant id. | planned (#3): HTTP interceptor spec; `e2e/tenancy.spec.ts` exists with both synthetic firms and is `fixme` until branding lands |
| Text and text containers size in `rem`. No `px` font sizes, no fixed heights on text containers. | stylelint `declaration-property-unit-disallowed-list` (`px`, `pt` and viewport units in `font-size` and `font`; `px`, `pt` in `line-height`); fixed heights are judgment, with clipped `overflow: hidden` text caught by `e2e/zoom.spec.ts` |
| No `outline: none` or zero outline. | stylelint `declaration-property-value-disallowed-list` |
| No `text-transform: uppercase` (no eyebrow labels). | stylelint `declaration-property-value-disallowed-list` |
| Every route passes axe with no serious or critical violations, at default and 200% text, and at 320 px with 200% text has no horizontal scroll or clipped text. | `e2e/a11y.spec.ts`, `e2e/zoom.spec.ts`; `e2e/guards.spec.ts` proves both checks catch real failures |
| Typed reactive forms only. No `FormsModule`, `ngModel` or hand-wired `(input)`/`(change)` value plumbing. | ESLint `no-restricted-imports` (`FormsModule`, `NgModel`, `NgForm`, `NgModelGroup`, `Untyped*`); `tools/check-journey-templates.mjs` for `(input)` and `(change)` |
| Component and directive selectors use the `ret` prefix. | `@angular-eslint/component-selector`, `@angular-eslint/directive-selector` |
| No `any` outside specs. | `@typescript-eslint/no-explicit-any` |
| Write "adviser", not "advisor", in copy and new identifiers. | judgment |
| Every lint, stylelint and script check above fails on a bad example and passes on the fix. | `tools/guards.test.mjs`, `tools/ui-guards.test.mjs` in `npm test` |
| One primary action per screen. Confirm, Save or Continue is the right-hand button. | judgment (`journey-ux.instructions.md`) |
| Two options use YesNo. Three or more use the card RadioGroup. | judgment (`journey-ux.instructions.md`) |
| KISS: build the simplest version that meets the contract, with no extra tier, flag, guard, abstraction or machinery the contract did not ask for. Read the diff for anything removable and remove it. | judgment, with the KISS pass in `verify-change` and the `implementer` and `reviewer` roles |
| Comment only a non-obvious why. Rename before commenting, and keep a survivor to one line. | judgment |
| Prefer positional arguments over an options object for one or two flags. | judgment |
| Copy the nearest existing analogue. Ask before adding a new abstraction. | judgment |
| When the user is reviewing a plan, resolve findings and wait for an explicit go before building. | judgment |
| Every non-trivial PR gets the `codex-review` loop before it is marked ready or merged; trivial ones (docs only, tooling copies, about 30 lines or fewer, no trust-boundary path) skip it and say so. Triage each Codex finding against the code and the KISS rule; never accept one because Codex raised it. | judgment (`codex-review` skill, `tools/codex-review.mjs`) |
