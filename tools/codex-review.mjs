import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SOL = 'gpt-6.2-sol';
const TERRA = 'gpt-6.1-terra';
const SOL_CHANGED_LINES = 600;
const MINUTES = 60_000;
const EFFORT = 'medium';

// Where a miss costs most: trust boundaries, shared contracts, and anything that runs the checks.
const SOL_PATHS = [
  /(^|\/)(tenant|auth|verif|invit|storage)/i,
  /interceptor/i,
  /^src\/app\/(api|journey|interfaces)\//,
  /^projects\/ui\/src\/lib\/(interfaces|tokens)\//,
  /^e2e\/tenancy/,
  /^(\.github|\.claude|\.codex|tools)\//,
  /^(package(-lock)?\.json|angular\.json|eslint\.config|playwright\.config|stylelint\.config|tsconfig)/,
];

const PROMPT = `You are an independent reviewer of a pull request in this repository.
Read AGENTS.md first for the rules, then review the pull request's changes.

Review for correctness, tenant isolation, accessibility, component reuse (a forked or one-off component is a finding), state and error handling, privacy of client answers, and missing behavioural tests. Ignore style concerns that tooling already enforces.

Report only problems you can point to in the changed code, with the line number in the new file. Report at most 10, most severe first. No findings is a valid answer. Write short plain sentences.
Read the diff yourself with the git command below, one file at a time; skip generated files unless a finding depends on them. Read other files only to confirm a finding. Do not edit files, install, build, run tests or use the network. Do not spawn other agents. Do not read or quote .env files, credentials, logs or files git ignores.
Keep it simple: do not suggest new abstractions, options, fallbacks or extra guards unless the change is wrong without them. Prefer the smallest fix.

`;
const RESPONSE_MARK = '**Response to Codex review**';

const list = (files) => files.map((f) => `- ${f}`).join('\n');
const focusNote = (focus = []) =>
  focus.length ? `\nStart with these files:\n${list(focus)}\n` : '';
const prList = (prs) => prs.map((p) => `#${p}`).join(' and ');

// The prompt names the PR, its commits and its files; Codex reads the diff from the local checkout itself.
// Several PRs means one combined review of a local branch that holds all their heads.
export function buildPrompt({ pr, base, head, files, notes, focus }) {
  const what = Array.isArray(pr)
    ? `This is one combined review of pull requests ${prList(pr)}, merged locally in that order`
    : `This is pull request #${pr}`;
  return `${PROMPT}${notes}${what}. The head ${head} is checked out. Read each file's changes with:\n  git diff ${base}...${head} -- <file>\n\nChanged files:\n${list(files)}\n${focusNote(focus)}`;
}

const PLAN_PROMPT = `You are an independent reviewer of a feature contract in this repository, before any code is written.
Read AGENTS.md first. Then review the contract for what would make the implementation wrong: a missing invariant, a race, a tenant or privacy leak, a design that is fragile or harder than it needs to be, or a conflict with the existing code it names. Read the code it refers to only to confirm a finding.

Report only problems you can point to in the contract, with its line number. Report at most 10, most severe first. No findings is a valid answer. Write short plain sentences.
Do not edit files, install, build, run tests or use the network. Do not spawn other agents. Do not read or quote .env files, credentials, logs or files git ignores.
Keep it simple: do not suggest new abstractions, options, fallbacks or extra guards unless the plan is wrong without them.

`;

export function buildPlanPrompt({ plan, focus }) {
  return `${PLAN_PROMPT}The feature contract ${plan} is in the checked-out working tree.\n${focusNote(focus)}`;
}

export function planReport(result) {
  return [
    result.summary,
    ...(result.findings.length
      ? result.findings.map(
          (f) => `${f.severity}: ${f.title} (${f.file}${f.line ? `:${f.line}` : ''})\n  ${f.body}`,
        )
      : ['No findings.']),
  ].join('\n\n');
}

// One PR's share of a combined review: its own findings and count. Lines are in the combined head, so no inline comments.
export function combinedReviewBody(result, model, prFiles, prs, head) {
  const mine = result.findings.filter((f) => prFiles.includes(f.file));
  const text = (f) =>
    `**${f.severity}: ${f.title}**\n\n${f.body}\n\n\`${f.file}${f.line ? `:${f.line}` : ''}\``;
  return [
    `**Codex review** (${model}, ${EFFORT} reasoning). One combined review of ${prList(prs)} at local head ${head.slice(0, 8)}. ${mine.length} of ${result.findings.length} findings are on this PR's files; line numbers are in the combined head.`,
    ...mine.map(text),
  ].join('\n\n');
}

export function parseArgs(argv) {
  const usage = new Error(
    'Usage: node tools/codex-review.mjs <pr> [<pr>...] [--focus a,b] | --plan <contract.md> [--focus a,b]',
  );
  const out = { prs: [], plan: null, focus: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--focus') out.focus = (argv[++i] ?? '').split(',').filter(Boolean);
    else if (argv[i] === '--plan') out.plan = argv[++i] ?? null;
    else if (/^\d+$/.test(argv[i])) out.prs.push(argv[i]);
    else throw usage;
  }
  if (out.plan ? out.prs.length > 0 : out.prs.length === 0) throw usage;
  return out;
}

// Earlier findings the author has already answered, so a later round does not raise them again.
export function answeredNotes(comments) {
  const answers = comments.map((c) => c.body).filter((b) => b.startsWith(RESPONSE_MARK));
  return answers.length
    ? `Findings already answered by the author. Do not raise them again unless the code shows the answer is wrong:\n\n${answers.join('\n\n')}\n\n`
    : '';
}

// Tokens Codex reported for the turn, from its --json event stream.
export function usageOf(events) {
  const done = events
    .split('\n')
    .filter((l) => l.includes('"turn.completed"'))
    .pop();
  const u = done ? JSON.parse(done).usage : null;
  return u
    ? `${u.input_tokens} in (${u.cached_input_tokens} cached), ${u.output_tokens} out`
    : 'usage unknown';
}

// 'gpt-6.2-sol' becomes '6.2 Sol Medium | #69', for the banner that tells the user Codex is running.
export function reviewTag(model, pr) {
  const [version, name] = model.replace(/^gpt-/, '').split('-');
  const title = (word) => word[0].toUpperCase() + word.slice(1);
  return `${version} ${title(name)} ${title(EFFORT)} | #${pr}`;
}

export function routeModel(files, changedLines) {
  const sensitive = files.some((file) => SOL_PATHS.some((re) => re.test(file)));
  return sensitive || changedLines > SOL_CHANGED_LINES ? SOL : TERRA;
}

// Lines of the new file a review comment can attach to: added and context lines inside hunks.
export function parseDiff(diff) {
  const commentable = new Map();
  let lines = null;
  let inHunk = false;
  let next = 0;
  let changed = 0;
  for (const line of diff.split('\n')) {
    if (line.startsWith('diff --git')) {
      lines = null;
      inHunk = false;
    } else if (!inHunk && line.startsWith('+++ ')) {
      const path = line.slice(4).replace(/^b\//, '');
      lines = line === '+++ /dev/null' ? null : new Set();
      if (lines) commentable.set(path, lines);
    } else if (line.startsWith('@@')) {
      inHunk = true;
      next = Number(/\+(\d+)/.exec(line)?.[1] ?? 0);
    } else if (inHunk && (line.startsWith('+') || line.startsWith('-'))) {
      changed++;
      if (line.startsWith('+')) lines?.add(next++);
    } else if (inHunk && line.startsWith(' ')) {
      lines?.add(next++);
    }
  }
  return { commentable, changed };
}

export function buildReview(result, model, commentable, commit) {
  const anchored = (f) => commentable.get(f.file)?.has(f.line);
  const text = (f) => `**${f.severity}: ${f.title}**\n\n${f.body}`;
  const loose = result.findings.filter((f) => !anchored(f));
  const body = [
    `**Codex review** (${model}, ${EFFORT} reasoning)`,
    result.summary,
    ...(result.findings.length ? [] : ['No findings.']),
    ...loose.map((f) => `${text(f)}\n\n\`${f.file}${f.line ? `:${f.line}` : ''}\``),
  ].join('\n\n');
  const comments = result.findings
    .filter(anchored)
    .map((f) => ({ path: f.file, line: f.line, side: 'RIGHT', body: text(f) }));
  return { commit_id: commit, event: 'COMMENT', body, comments };
}

// Codex prints its errors (a usage limit, a bad model) to the --json stream, not stderr.
export function failureOf(stdout, stderr) {
  const failed = (stdout ?? '')
    .split('\n')
    .filter((l) => l.includes('"turn.failed"') || l.includes('"type":"error"'))
    .pop();
  if (!failed) return stderr;
  const event = JSON.parse(failed);
  return event.error?.message ?? event.message ?? stderr;
}

function run(cmd, args, input) {
  const r = spawnSync(cmd, args, {
    encoding: 'utf8',
    input,
    maxBuffer: 100 * 1024 * 1024,
    timeout: 8 * MINUTES,
  });
  if (r.status !== 0) {
    throw new Error(
      `${cmd} ${args.slice(0, 3).join(' ')} failed:\n${r.error?.message ?? failureOf(r.stdout, r.stderr)}`,
    );
  }
  return r.stdout;
}

const SCHEMA = join(dirname(fileURLToPath(import.meta.url)), 'codex-review.schema.json');

// Read-only, one process, no helper agents, no user config (its desktop review settings post on their own).
function codex(model, prompt) {
  const out = join(mkdtempSync(join(tmpdir(), 'codex-review-')), 'result.json');
  const events = run(
    'codex',
    [
      'exec',
      '-m',
      model,
      '-c',
      `model_reasoning_effort="${EFFORT}"`,
      '-s',
      'read-only',
      '--ephemeral',
      '--ignore-user-config',
      '--disable',
      'multi_agent',
      '--disable',
      'multi_agent_v2',
      '--output-schema',
      SCHEMA,
      '--json',
      '-o',
      out,
      '-',
    ],
    prompt,
  );
  return { result: JSON.parse(readFileSync(out, 'utf8')), usage: usageOf(events) };
}

function assertClean() {
  if (run('git', ['status', '--porcelain']).trim()) {
    throw new Error('Commit or stash local changes first. Codex reads the working tree.');
  }
}

function review(prs, focus) {
  const metas = prs.map((pr) => ({
    pr,
    ...JSON.parse(run('gh', ['pr', 'view', pr, '--json', 'headRefOid,baseRefName,url,comments'])),
  }));
  const head = run('git', ['rev-parse', 'HEAD']).trim();
  const combined = prs.length > 1;
  for (const m of metas) {
    const contained = combined
      ? spawnSync('git', ['merge-base', '--is-ancestor', m.headRefOid, 'HEAD']).status === 0
      : m.headRefOid === head;
    if (!contained) {
      throw new Error(
        combined
          ? `Check out a local branch that merges every PR head; #${m.pr}'s head is not in it.`
          : `Check out the PR head first (gh pr checkout ${m.pr}). Codex reads the working tree.`,
      );
    }
  }
  assertClean();
  const baseRef = metas[0].baseRefName;
  run('git', ['fetch', '-q', 'origin', baseRef]);
  const base = run('git', ['merge-base', `origin/${baseRef}`, 'HEAD']).trim();
  // The diff is read here only to route the model and anchor comments; it is not sent to Codex.
  const diff = combined
    ? run('git', ['diff', `${base}...${head}`])
    : run('gh', ['pr', 'diff', prs[0]]);
  const files = combined
    ? run('git', ['diff', '--name-only', `${base}...${head}`])
        .trim()
        .split('\n')
    : run('gh', ['pr', 'diff', prs[0], '--name-only']).trim().split('\n');
  const { commentable, changed } = parseDiff(diff);
  const model = routeModel(files, changed);
  const notes = metas.map((m) => answeredNotes(m.comments)).join('');
  const prompt = buildPrompt({ pr: combined ? prs : prs[0], base, head, files, notes, focus });

  const tag = reviewTag(model, prs.join(' + #'));
  console.log(`[CODEX REVIEW STARTED | ${tag}]`);
  const { result, usage } = codex(model, prompt);
  for (const m of metas) {
    const body = combined
      ? {
          commit_id: m.headRefOid,
          event: 'COMMENT',
          comments: [],
          body: combinedReviewBody(
            result,
            model,
            run('gh', ['pr', 'diff', m.pr, '--name-only']).trim().split('\n'),
            prs,
            head,
          ),
        }
      : buildReview(result, model, commentable, m.headRefOid);
    run(
      'gh',
      ['api', `repos/{owner}/{repo}/pulls/${m.pr}/reviews`, '--input', '-'],
      JSON.stringify(body),
    );
    console.log(`posted on ${m.url}`);
  }
  console.log(`[CODEX REVIEW DONE | ${tag}] ${result.findings.length} findings, ${usage}`);
}

function planReview(plan, focus) {
  assertClean();
  const tag = reviewTag(SOL, plan).replace('#', '');
  console.log(`[CODEX PLAN REVIEW STARTED | ${tag}]`);
  const { result, usage } = codex(SOL, buildPlanPrompt({ plan, focus }));
  console.log(planReport(result));
  console.log(`[CODEX PLAN REVIEW DONE | ${tag}] ${result.findings.length} findings, ${usage}`);
}

if (import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  try {
    const { prs, plan, focus } = parseArgs(process.argv.slice(2));
    if (plan) planReview(plan, focus);
    else review(prs, focus);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
