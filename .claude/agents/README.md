# Claude Code agents

These are the role definitions for this repository's multi-agent workflow. `AGENTS.md` sets when each role runs. `.codex/agents/*.toml` mirrors the same roles for Codex, which names them with underscores (`plan_reviewer`, `test_reviewer`, `security_reviewer`, `accessibility_reviewer`).

## Model assignment

| Role | Claude Code (`.claude/agents`) | Codex (`.codex/agents`) |
| --- | --- | --- |
| Parent and orchestrator | session model | `gpt-6-luna` high |
| `mapper` | Sonnet | `gpt-6-luna` medium |
| `implementer` | Sonnet | `gpt-6-luna` high |
| `test-reviewer` | Sonnet | `test_reviewer`, `gpt-6-luna` high |
| `reviewer` | Opus | `gpt-6-luna` xhigh |
| `security-reviewer` | Opus | `security_reviewer`, `gpt-6-sol` high |
| `accessibility-reviewer` | Opus | `accessibility_reviewer`, `gpt-6-sol` high |
| `plan-reviewer` | Opus | `plan_reviewer`, `gpt-6-sol` high |
| PR review (`codex-review` skill) | not an agent | `gpt-6.2-sol` medium for trust boundaries, shared contracts and large diffs, else `gpt-6.1-terra` medium |
| Feature-contract draft | the parent | plan-only `gpt-6-sol` medium subagent |

- **Sonnet**: `mapper`, `implementer`, `test-reviewer`. Bounded, well-specified work.
- **Opus**: `reviewer`, `plan-reviewer`, `security-reviewer`, `accessibility-reviewer`. The highest-scrutiny passes.

Haiku is not used. `mapper` output is evidence that later agents build on without re-checking, so a weak context pack costs more in rework than it saves.

Read-only roles have no `Edit`, `Write` or `NotebookEdit` tool.
