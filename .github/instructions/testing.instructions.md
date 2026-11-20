---
applyTo: "**/*.spec.ts"
---

# Tests

Test behaviour, not implementation trivia.

## Levels

- **Component specs** (`projects/ui/**`): every variant and state renders, inputs change output, outputs fire, `ControlValueAccessor` round-trips a value, keyboard interaction works, labels and descriptions are wired.
- **Renderer and journey specs**: a question definition renders the right component; follow-ups open and close on the parent answer; Continue appears only when the screen is complete; drafts save and restore.
- **Playwright e2e** (`e2e/`): one smoke path per journey, plus the cross-cutting specs below.

## Cross-cutting specs that must stay green

- `e2e/a11y.spec.ts`: axe on every route and key state.
- `e2e/zoom.spec.ts`: 320 px width with 200% text, no horizontal scroll or clipped text.
- `e2e/tenancy.spec.ts`: two synthetic firms on two hosts never see each other's branding or data.

## Rules

- Synthetic data only. Use the demo firms and households in `docs/agentic-memory.md`.
- A test that would still pass if the component rendered nothing, or every function returned `undefined`, is not a test. Assert on what the client sees or what the API receives.
- Query by role and accessible name (`getByRole('button', { name: 'Confirm' })`), not by CSS class or test id, so the spec also checks accessibility.
- Do not mock the component under test. Mock HTTP at the boundary.
