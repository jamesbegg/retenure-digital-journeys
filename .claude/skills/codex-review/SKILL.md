---
name: codex-review
description: Run the Codex review loop on a non-trivial PR before it is marked ready or merged. Codex posts a public review, the parent triages it with a KISS filter, fixes what is real, and repeats until nothing survives triage. Use whenever a PR is ready for review or merge, and when the user asks for a Codex review.
---

# Codex review loop

Codex and the Claude reviewers catch different things, so every PR gets both before it is marked ready or merged. Claude Code runs this skill. Codex does not review its own work.

## When to skip

Skip the loop, and say so, when the PR is trivial: docs only, a copy of a tool from another repository, or under about 30 changed lines, and it touches no path the routing in `tools/codex-review.mjs` sends to Sol. Everything else gets the loop. One round costs 90-215k tokens on Sol.

## One round

```sh
gh pr checkout <pr> && node tools/codex-review.mjs <pr> [--focus path,path]
```

- **Name the key files** with `--focus` when you know where the risk is (the service, not its specs). Codex starts there instead of exploring, which cuts the tokens a round reads.
- **Several stacked or related PRs in one request:** check out a local branch that merges every PR head in order, then run `node tools/codex-review.mjs <pr> <pr>`. Codex reviews the combined range once, and the script posts one review on each PR with only the findings on that PR's files and its own count ("2 of 7 findings are on this PR's files"). Line numbers are in the combined head, so these reviews have no inline comments.

The script owns the cost and safety limits. Do not call `codex exec` by hand for a review.

- **One process.** One `codex exec`, read-only, `--ephemeral`, multi-agent features disabled, 8 minute timeout. It never spawns helpers.
- **One model, chosen by the script.** `gpt-6.2-sol` when the PR touches tenancy, auth, verification, invitations, storage, interceptors, `src/app/api`, journey state, shared UI interfaces or tokens, `e2e/tenancy`, repo config, `tools/` or agent config, or changes over 600 lines. Otherwise `gpt-6.1-terra`. Both at medium reasoning. Do not override the model; change the routing in `tools/codex-review.mjs` and its spec if it is wrong.
- **Codex pulls the diff itself.** The prompt names the PR, its base and head commits and its changed files. Codex reads each file's changes from the checkout with `git diff`, read-only, and reads other files only to confirm a finding. No diff is pasted into the prompt, so there is no size limit; a very large PR still costs more, so keep PRs focused.
- **It posts one public PR review.** Findings on a changed line are inline comments. The rest are in the summary. The diff must contain only synthetic data.
- **It prints a banner and its token use.** `[CODEX REVIEW STARTED | 6.2 Sol Medium | #69]` when it starts and `[CODEX REVIEW DONE | ...]` when it posts. Tell the user in your own message when you start a round and when it ends, using the same banner, and report the token use in the verification summary.

## Plan review, before any code

For a non-trivial feature, run Codex on the feature contract once it passes the Claude plan review and before implementation starts:

```sh
node tools/codex-review.mjs --plan docs/features/<feature>.md [--focus path,path]
```

It prints its findings in the terminal and posts nothing. Triage them like any other plan finding. A design flaw is far cheaper to fix in the contract than across three rounds of code review.

## The loop

Run the Claude reviewers and this script in parallel on the same head. Then:

1. **Triage every Codex finding yourself.** Never accept one because Codex said so. Read the code and put it in a `verify-change` bucket: act on, consider, noted, dismissed.
2. **Apply the KISS filter.** Codex tends to over-engineer. Dismiss or shrink a finding when its fix adds an abstraction, option, flag, fallback, extra guard, config or test of trivia that the contract did not ask for. A finding survives only if it names a real defect: wrong behaviour, a tenant-isolation or client-answer privacy leak, an accessibility failure, a rule in `AGENTS.md` broken, or a behaviour with no test. Fix it with the smallest change, which is often less code, not more.
3. **Fix what survives, then run the affected checks and push.**
4. **Answer on the PR** with one comment that starts with `**Response to Codex review**`. List each finding as fixed, or dismissed with the reason in a sentence. The script feeds these answers into the next round so Codex does not raise them again.
5. **Run the script again** on the new head.

Stop when a round leaves nothing to act on, or after three rounds. At the cap, give the user the open findings and your recommendation instead of running a fourth. Disagreement is allowed to stand: a finding you dismissed with a stated reason does not need Codex to agree.
