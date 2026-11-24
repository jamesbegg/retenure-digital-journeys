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
Read AGENTS.md first for the rules, then review the pull request below.

Review for correctness, tenant isolation, accessibility, component reuse (a forked or one-off component is a finding), state and error handling, privacy of client answers, and missing behavioural tests. Ignore style concerns that tooling already enforces.

Report only problems you can point to in the changed code, with the line number in the new file. Report at most 10, most severe first. No findings is a valid answer. Write short plain sentences.
Read other files only to confirm a finding. Do not edit files, install, build, run tests or use the network. Do not spawn other agents.
Keep it simple: do not suggest new abstractions, options, fallbacks or extra guards unless the change is wrong without them. Prefer the smallest fix.

`;
const RESPONSE_MARK = '**Response to Codex review**';

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
      lines = line.endsWith('/dev/null') ? null : new Set();
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

// The prompt carries the PR number and context only. Codex reads the diff itself.
export function buildPrompt(pr, meta) {
  return `${PROMPT}Pull request #${pr}: ${meta.title}

${meta.body}

${answeredNotes(meta.comments)}The working tree is the PR head. See the changes with: git diff origin/${meta.baseRefName}...HEAD
`;
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
      `${cmd} ${args.slice(0, 3).join(' ')} failed:\n${r.error?.message ?? r.stderr}${r.stdout.slice(-400)}`,
    );
  }
  return r.stdout;
}

function review(pr) {
  const meta = JSON.parse(
    run('gh', ['pr', 'view', pr, '--json', 'headRefOid,url,comments,title,body,baseRefName']),
  );
  if (run('git', ['rev-parse', 'HEAD']).trim() !== meta.headRefOid) {
    throw new Error(
      `Check out the PR head first (gh pr checkout ${pr}). Codex reads the working tree.`,
    );
  }
  if (run('git', ['status', '--porcelain']).trim()) {
    throw new Error('Commit or stash local changes first. Codex reads the working tree.');
  }
  const range = `origin/${meta.baseRefName}...HEAD`;
  run('git', [
    'fetch',
    '-q',
    'origin',
    `+refs/heads/${meta.baseRefName}:refs/remotes/origin/${meta.baseRefName}`,
  ]);
  const flags = ['--no-color', '--no-ext-diff', '--src-prefix=a/', '--dst-prefix=b/'];
  const diff = run('git', ['diff', ...flags, range]);
  const files = run('git', ['diff', '--name-only', range]).trim().split('\n');
  const { commentable, changed } = parseDiff(diff);
  const model = routeModel(files, changed);

  const prompt = buildPrompt(pr, meta);
  const dir = mkdtempSync(join(tmpdir(), 'codex-review-'));
  const out = join(dir, 'result.json');
  const schema = join(dirname(fileURLToPath(import.meta.url)), 'codex-review.schema.json');
  // Read-only, one process, no helper agents, no user config (its desktop review settings post on their own).
  const tag = reviewTag(model, pr);
  console.log(`[CODEX REVIEW STARTED | ${tag}]`);
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
    ]
      .concat(['--ignore-user-config', '--disable', 'multi_agent', '--disable', 'multi_agent_v2'])
      .concat(['--output-schema', schema, '--json', '-o', out, '-']),
    prompt,
  );

  const body = buildReview(
    JSON.parse(readFileSync(out, 'utf8')),
    model,
    commentable,
    meta.headRefOid,
  );
  run(
    'gh',
    ['api', `repos/{owner}/{repo}/pulls/${pr}/reviews`, '--input', '-'],
    JSON.stringify(body),
  );
  console.log(
    `[CODEX REVIEW DONE | ${tag}] ${body.comments.length} inline comments, ${usageOf(events)}, posted on ${meta.url}`,
  );
}

if (import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const pr = process.argv[2];
  if (!/^\d+$/.test(pr ?? '')) {
    console.error('Usage: node tools/codex-review.mjs <pr-number>');
    process.exit(1);
  }
  try {
    review(pr);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
