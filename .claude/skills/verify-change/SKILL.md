---
name: verify-change
description: Verify completed journey changes before handoff by inspecting the diff, running proportionate checks including accessibility, zoom and tenant isolation, and coordinating independent reviews for non-trivial work.
---

# Verify a change

Use repository evidence and executable checks; do not treat an implementation agent's completion report as proof.

1. Read `AGENTS.md`, the applicable focused instructions, and the feature contract or request.
2. Inspect `git status` and the relevant diff. Separate the current task from pre-existing user changes and never modify unrelated work.
3. Map changed behavior to acceptance criteria, invariants, and required documentation or generated configuration.
4. During iteration, run the targeted spec. Before completion run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` and `npm run e2e`. A script that does not exist yet is reported as not run, never as passing.
5. For any change a client can see, get browser evidence with synthetic data: each key state at 375 px and 1280 px, the changed flow at 320 px with 200% text, and a keyboard-only pass. Confirm `e2e/a11y.spec.ts` and `e2e/zoom.spec.ts` cover the changed routes.
6. For any change near tenancy, confirm `e2e/tenancy.spec.ts` passes and that every new storage key, cache key and request carries the tenant id.
7. Component reuse pass. Did the change add markup that duplicates a shared component, or put journey, firm or screen knowledge into one? Move it to a typed variant.
8. KISS pass. Read the diff once for anything the contract did not ask for: an extra tier, flag, option, guard, abstraction, fallback or helper used once. List what you would delete and delete it. Give `reviewer` the same question.
9. For non-trivial work, run `reviewer`, `test-reviewer` and `accessibility-reviewer` concurrently. Also run `security-reviewer` when tenant resolution, branding, verification, invitations, storage, untrusted input or sensitive data changed.
10. Deduplicate findings and verify each against code. Note which reviewers raised each one; a finding two reviewers raised independently is the strongest signal. Put every finding in one bucket with a one-line reason:
   - **Act on.** A real correctness, security, data-integrity, or maintainability issue that would block a PR. Fix it.
   - **Consider.** Legitimate, but the cost of fixing now may outweigh it. Report it to the user with the tradeoff.
   - **Noted.** Valid but not actionable at this stage. List it briefly.
   - **Dismissed.** Wrong, out of scope, or missing context. Give the concrete reason.
   Re-run affected checks after fixes.

## Failure triage

Before assigning a fix, classify each failed check as one of:

- regression caused by the change
- pre-existing repository failure
- flaky test
- environment or tooling failure
- incorrect verification selection
- unrelated concurrent working-tree change

Record the evidence for the classification. Fix only failures caused by the task, unless the user expands scope. Re-run the smallest affected profile after a fix, then the originally required completion profiles.

Do not deploy. Do not conceal failed checks. The final verification report must list checks run and outcomes, failure classifications, review findings by bucket, residual risks, and any checks not run with the reason. After a fix, rerun the smallest affected check; repeat a broad profile only if the fix could invalidate its earlier result.
