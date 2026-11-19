# Feature name

Status: draft
Risk: low
Plan review: not required

## Scope and non-goals

## Acceptance criteria

| ID | Behaviour | Owner | Implementation | Test or verification | Status |
|---|---|---|---|---|---|
| AC-1 | | | | | planned |

## Existing patterns reused

## Interfaces and data flow

## Security and ownership boundaries

## Invariants and failure semantics

## Lifecycle and state transitions

## Dependency graph and implementation waves

## File ownership

| Unit | Depends on | Owns | Model | Verification |
|---|---|---|---|---|
| | — | | | |

## Useful concurrency and change budget

Useful concurrency: describe the independent work units after subtracting shared-file collisions and unresolved interface dependencies.

Expected change shape:

- Work units:
- Files or directories:
- Dependencies:
- Architectural surfaces:

Replan before continuing affected work if a new production dependency, shared component, token or shared interface becomes necessary; implementation leaves the agreed domain; the file or wave count materially exceeds this budget; or parallel workers need the same file in the same wave.

## Acceptance-to-test traceability

| Acceptance criterion | Automated evidence |
|---|---|
| AC-1 | |

## Verification

Run the named repository verification commands appropriate to the change, for example `npm run verify:fast`.

## Compatibility and rollout

## Decisions

### Confirmed by the user

### Derived from repository conventions

### Safely inferred

### Unresolved and blocking

None.

### Unresolved and non-blocking

None.

## Plan review findings

Not required.

## Implementation readiness

- [ ] Every acceptance criterion has an implementation owner.
- [ ] Every invariant has an enforcement location.
- [ ] Externally visible command changes preserve existing commands.
- [ ] Safety and data boundaries are defined.
- [ ] Lifecycle and failure states are defined.
- [ ] Work units have disjoint ownership.
- [ ] Shared contracts precede dependent work.
- [ ] Material failures map to tests or verification.
- [ ] No unresolved decision can materially invalidate implementation.

## Outcome review

Required when status becomes `implemented`:

| Metric | Result | Evidence |
|---|---|---|
| Planned versus actual work units and files | | |
| Agents used | | |
| Accepted review findings | | |
| Rejected review findings | | |
| Verification failures by classification | | |
| Replans | | |
| Ownership conflicts | | |
| Human decisions | | |
| Residual risks | | |
| Post-completion defects | Unknown at completion | Update when known |
