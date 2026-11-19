# Feature contracts

Use this directory for concise implementation contracts for changes that cross the planning threshold in `AGENTS.md`. A contract is a durable coordination artifact, not a second architecture manual.

Each contract should contain only the sections needed from this outline:

```markdown
# Feature name

## Scope and non-goals
## Acceptance criteria
## Existing patterns reused
## Interfaces and data flow
## Security and ownership boundaries
## Invariants and failure semantics
## Lifecycle and state transitions
## Dependency graph and implementation waves
## File ownership
## Useful concurrency and change budget
## Acceptance-to-test traceability
## Verification
## Compatibility and rollout
## Decisions
### Confirmed by the user
### Derived from repository conventions
### Safely inferred
### Unresolved and blocking
### Unresolved and non-blocking
## Plan review findings
## Implementation readiness
## Outcome review
```

Record decisions that affect multiple workers before parallel implementation starts. Keep general repository rules in `.github/copilot-instructions.md`, not in feature contracts.

The `Implementation readiness` section should confirm that every acceptance criterion and invariant has an owner, shared interfaces precede dependent work, parallel writers have disjoint files, trust boundaries are covered, failure modes map to tests, and no blocking decision can invalidate work already underway.

When a contract becomes `implemented`, its outcome review records planned versus actual work, agents used, accepted and rejected findings, verification failures by classification, replans, ownership conflicts, human decisions, residual risks, and later defects when known. These objective fields are the feedback loop for improving the workflow.
