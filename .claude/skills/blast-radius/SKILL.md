---
name: blast-radius
description: Find what a change could break outside its own diff before it ships, and prove the one fact it is safe because of by running real code instead of writing it up. Use for "blast radius of X", "what could this break", reviewing a small diff you do not trust, or before designing a change whose brief asserts something about existing code.
---

# Blast radius

Find what a change breaks somewhere else, before it ships.

Listing the callers is not the job. You can grep those in a second. The job is the breakage grep does not show.

## Do not trust your own writeup

A blast-radius writeup that sounds right is worthless. It reads as convincing whether or not it is true. Find the one or two facts the whole change depends on and prove them by running code.

For each fact the change's safety depends on, take it as far down this list as is cheap, and say where it stopped:

1. You said so. Worthless on its own.
2. You pointed at the line. A real `file:line`, or the library's own source in `node_modules`.
3. You showed the bad case cannot happen. You walked the failure step by step and it does not reach.
4. You ran it. A component or unit spec that renders the real component or calls the exact function you are worried about, and fails loudly if you are wrong.
5. You reproduced it in the running app: `npm start` on two synthetic firm hosts, with a Playwright script that shows the behaviour.

## Steps

1. **Read the change.** Read the diff and the symbols it adds, changes, and deletes, and what it now does differently, including the part the diff does not spell out. Pull the history: `git log --oneline -20 -- <file>`, `git blame -L <start>,<end> <file>`, and `gh pr view <n> --json title,body,comments` for the PRs behind it.
2. **Find the one fact it is safe because of.** Most changes that look risky are safe because of a single fact, such as "this condition expression only rejects writes from an older run". If it holds, most risky cases clear at once. Spend your time here, not on a long list of maybes.
3. **Look where grep stops.** In this repository that usually means:
   - Shared components: every journey and the studio preview that uses the component, and every variant of it. Grep the selector and the input names.
   - Tokens and theming: a token change reaches every firm's theme. Check contrast with the darkest and lightest synthetic firm theme.
   - Tenancy: caches, service worker, storage keys, emails and share previews that might hold one firm's data or branding.
   - Font scaling: what wraps, clips or overflows at 200% text and 320 px.
   - Wire formats: the journey and question JSON the backend returns, and the answers this app posts.
   - Library behavior: read the pinned version's source when the change relies on it.
4. **Be honest about each risk.** Give it a real chance of happening and a real cost if it does. Keep the risks you confirmed. List the ones you checked and cleared separately. Cite a real `file:line`. A search that finds nothing is still an answer. Never make up a caller or an API.
5. **Prove the one fact.** Write the spec or script, run it, and paste what happened.
6. **For a big or wide change**, also give the same question to a `reviewer` agent and merge its answer with yours.

## What to hand back

- **What it does.** What changed, including the part that is not obvious.
- **The one fact it is safe because of.** State it, say which level you got it to, and show the proof. If you could not prove it, write unproven.
- **Risks.** Each names how it breaks, the `file:line`, how likely and how bad, and how to check. Paste the proof for the ones that matter.
- **Cleared.** What you checked and why it is fine.
- **Before you merge.** The cheapest test or repro that catches the real bug, including the script you wrote.

Write it through the `unslop` skill and cite real code.
