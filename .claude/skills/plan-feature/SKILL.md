---
name: plan-feature
description: Plan non-trivial journey features and cross-cutting changes before implementation, especially when work changes tenant resolution or branding, the questions engine, a shared component's inputs, journey state, or several independently owned areas.
---

# Plan a feature

Build an evidence-backed implementation contract that can safely drive parallel work.

1. Read `AGENTS.md`, `.github/copilot-instructions.md`, relevant focused instructions, and any existing feature document.
2. Translate the request into explicit scope, acceptance criteria, constraints, and non-goals. Mark missing product decisions without inventing them.
3. Spawn `mapper` agents in parallel only for independent discovery areas. Useful boundaries include tenant resolution and theming, shared components, the journey renderer, API contracts with the backend, and tests. Give each mapper one bounded question.
4. Inspect the strongest analogous implementations. Reuse existing boundaries and name concrete paths and symbols.
5. Synthesize the findings into `docs/features/<feature>.md` when the change crosses a planning threshold in `AGENTS.md`; otherwise keep the plan in the task.

Keep discovery bounded: ask each mapper one non-overlapping question with a concise output target, and reuse its findings instead of repeating the same repository search. Once the readiness gate passes, implement without a second planning loop unless new evidence crosses a recorded replanning trigger.

The plan or feature contract must include:

- scope, non-goals, and acceptance criteria
- existing patterns and shared components to reuse, and any new variant each needs
- for UI work: the client's task, the primary action, every state (loading, empty, error, blocked, expired), and narrow and wide layouts
- accessibility at 200% text and 320 px wide
- proposed interfaces and data flow
- lifecycle states and state transitions where behavior is stateful
- tenant isolation, verification, privacy and data-ownership boundaries
- invariants, failure behavior, retries, and idempotency where applicable
- dependency graph and implementation waves
- disjoint file ownership for parallel writers
- acceptance-criterion-to-test traceability and deterministic verification
- compatibility, rollout, and rollback considerations
- decisions classified as confirmed, derived from repository conventions, safely inferred, unresolved and blocking, or unresolved and non-blocking
- a change budget that describes the expected shape and explicit replanning triggers

## Useful concurrency

Choose parallelism from the dependency graph, not from the available thread limit:

```text
useful concurrency = independent work units - shared-file collisions - unresolved interface dependencies
```

Read-only discovery can fan out more widely. For implementation, prefer a few coherent workers, assign one owner per file per wave, and sequence any work that shares interfaces or repeatedly needs the other worker's output. If integration cost approaches implementation cost, collapse the work back to one worker.

## Change budget

Record the expected number and kinds of files, work units, dependencies, and architectural surfaces. Add concrete replanning triggers such as a new production dependency, new shared component or token, modification outside the agreed domain, shared-interface changes, or a material increase in files or waves. Exceeding the budget does not automatically fail the task; it requires the parent to update the contract before continuing affected work.

## Plan review gate

Before implementation, spawn `plan-reviewer` (Codex: `plan_reviewer`) when any of these apply:

- authentication, authorization, or tenant isolation changes
- tenant resolution, branding or any cross-firm boundary
- the questions engine, question library or journey builder
- a shared component's public inputs or a new shared component
- journey state, drafts or submission
- an external provider or other trust boundary
- three or more implementation work units
- more than one implementation wave
- failure could lose, corrupt or expose client answers, or show one firm's branding to another firm's client

Give the reviewer the contract and the minimum repository evidence needed to challenge it. The reviewer is advisory and read-only. The parent must verify each finding, update the contract for accepted findings, and record why any blocker-level finding was rejected.

Draft the contract with the drafting role named in `AGENTS.md`. The parent owns the user intent, architecture, contract, and resolution of review findings.

## Design gate

For UI work that is not trivial under `AGENTS.md`, draft two or three low-fidelity layout options (one for a material change to an existing screen) as self-contained static HTML with synthetic data, have `plan-reviewer` challenge the contract and every option, and show the reviewed options to the user with a recommendation. Record the chosen layout in the contract as a short text summary. Never commit mockups.

## Implementation readiness

Do not release implementation workers until all applicable checks pass:

- every acceptance criterion has an implementation owner
- every invariant has an enforcement location
- every externally visible change has compatibility treatment
- every trust boundary has an authorization and validation strategy
- lifecycle states and failure transitions are defined where applicable
- parallel work units have disjoint file ownership
- shared interfaces land before dependent work starts
- every material failure mode maps to a test or explicit verification step
- no unresolved decision can materially change implementation already underway
- the change budget and replanning triggers are explicit

Record the result in the contract under `Implementation readiness`. This gate is not a mandatory user approval step. If implementation was requested and no consequential decision blocks it, proceed in dependency order.

Prefer a few coherent work units over many tiny agents. Shared interfaces land before dependent workers start. The primary agent owns architecture and synthesis; mapper output is evidence, not authority.

If implementation is also requested and no consequential decision blocks it, proceed using the approved dependency order. Do not require a separate user checkpoint merely because a plan was written.
