---
name: codex-review
description: Run the Codex review loop on a PR before it is marked ready or merged. Codex posts a public review, the parent triages it with a KISS filter, fixes what is real, and repeats until nothing survives triage. Use whenever a PR is ready for review or merge, and when the user asks for a Codex review.
---

# Codex review loop

Codex and the Claude reviewers catch different things, so every PR gets both before it is marked ready or merged. Claude Code runs this skill. Codex does not review its own work.

## One round

```sh
gh pr checkout <pr> && node tools/codex-review.mjs <pr>
```

The script owns the cost and safety limits. Do not call `codex exec` by hand for a review.

- **One process.** One `codex exec`, read-only, `--ephemeral`, multi-agent features disabled, 8 minute timeout. It never spawns helpers.
- **One model, chosen by the script.** `gpt-6.2-sol` when the PR touches tenancy, auth, verification, invitations, storage, interceptors, `src/app/api`, journey state, shared UI interfaces or tokens, `e2e/tenancy`, repo config, `tools/` or agent config, or changes over 600 lines. Otherwise `gpt-6.1-terra`. Both at medium reasoning. Do not override the model; change the routing in `tools/codex-review.mjs` and its test if it is wrong.
- **The diff is in the prompt.** Codex reads other files only to confirm a finding. A diff over 300 KB is refused: split the PR.
- **It posts one public PR review.** Findings on a changed line are inline comments. The rest are in the summary. The diff must contain only synthetic data.
- **It prints a banner and its token use.** `[CODEX REVIEW STARTED | 6.2 Sol Medium | #69]` when it starts and `[CODEX REVIEW DONE | ...]` when it posts. Tell the user in your own message when you start a round and when it ends, using the same banner, and report the token use in the verification summary.

## The loop

Run the Claude reviewers and this script in parallel on the same head. Then:

1. **Triage every Codex finding yourself.** Never accept one because Codex said so. Read the code and put it in a `verify-change` bucket: act on, consider, noted, dismissed.
2. **Apply the KISS filter.** Codex tends to over-engineer. Dismiss or shrink a finding when its fix adds an abstraction, option, flag, fallback, extra guard, config or test of trivia that the contract did not ask for. A finding survives only if it names a real defect: wrong behaviour, a tenant or privacy leak, an accessibility failure, a rule in `AGENTS.md` broken, or a behaviour with no test. Fix it with the smallest change, which is often less code, not more.
3. **Fix what survives, then run the affected checks and push.**
4. **Answer on the PR** with one comment that starts with `**Response to Codex review**`. List each finding as fixed, or dismissed with the reason in a sentence. The script feeds these answers into the next round so Codex does not raise them again.
5. **Run the script again** on the new head.

Stop when a round leaves nothing to act on, or after three rounds. At the cap, give the user the open findings and your recommendation instead of running a fourth. Disagreement is allowed to stand: a finding you dismissed with a stated reason does not need Codex to agree.
