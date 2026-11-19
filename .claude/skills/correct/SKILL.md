---
name: correct
description: Find the mistakes agents keep repeating in this repository and make each one impossible. Fix each at the highest level that works (architecture, then types, then a check script whose error names the fix, then a test, docs last) and prove each check fails on a real past mistake. Use for /correct, or when the user corrects an agent for something it was already told.
---

# Correct

The user keeps correcting agents in this repository for the same mistakes. Change the repository so the next agent cannot make them.

Assume every contributor is an agent that sees only the files it opened, copies the nearest example, and takes the shortest path that compiles. Design the repository so a change that looks right from one file is right for the whole repository.

## Find the mistake classes

Read the evidence first:

- recent commits, reverts, and fix-up commits (`git log --oneline -100`, `git log --grep=revert -i`)
- PR review comments (`gh pr list --state merged --limit 30`, then `gh pr view <n> --comments`)
- the user's feedback memories in this project's Claude memory directory (files with `type: feedback`)
- `AGENTS.md`, `.github/copilot-instructions.md`, `.github/instructions/`, and `docs/agentic-memory.md`
- comments that explain a workaround

Group the mistakes into classes. A class counts once it has happened twice.

## Fix each class at the highest level that works

1. **Eliminate it with architecture.** Give each piece of state one owner and each task one supported way. Hide internals so the wrong import fails. Replace hand-synced lists with one source of truth. Delete old ways and dead code an agent would copy. Nothing is live yet, so deleting the old way is allowed.
2. **Enforce it with types** so the bad state cannot be written.
3. **Add a lint rule or check script** when bad code still compiles. Prefer an ESLint or stylelint rule (`no-restricted-imports`, `no-restricted-syntax`, `declaration-property-value-disallowed-list`, `unit-disallowed-list`); otherwise a small Node script with a spec and a `check:*` entry in `package.json` that `npm run lint` runs. The error message names the component, token or function to use instead. If the pattern is already common, fail only when a change adds more.
4. **Test the behaviour.** For tenancy and accessibility, a Playwright spec is often the right level. Fix or delete any test that would still pass if every function it calls returned nothing.
5. **Write docs or agent rules last**, only for judgment calls. Nothing fails when an agent skips them.

## Fix and prove

Fix the most frequent classes now, one commit each. Prove each new check fails on a real past mistake: check out or reconstruct the offending code, run the check, and keep the failing output for the reply and the PR description. The proof lives there, once. The spec never holds the real mistake as a fixture and never asserts that a particular function is or is not flagged; it tests the rule's boundaries and behaviors with minimal generic snippets (the limit passes, one past it fails, the message names the fix, the scope and baseline rules hold). Run the same command locally that CI runs. An exception goes on the offending line with a reason, an expiry date, and the user's approval.

## Keep the rule table

Keep an `## Enforced rules` table in `AGENTS.md` that pairs each rule with what enforces it (the type, script, or test). Create it on the first run. When the user corrects you, fix the mistake and add the rule. If the rule was already there and nothing enforces it, that is a repeat, so fix it at the highest level in the same change. Drop a rule once its mistake cannot happen. When a feedback memory becomes enforced, update the memory to point at the check.

**Reply:** each class with its evidence, the level you picked, why a higher level did not work, and the failing-then-passing output of each new check.
