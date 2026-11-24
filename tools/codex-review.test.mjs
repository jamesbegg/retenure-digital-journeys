import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as review from './codex-review.mjs';

describe('routeModel', () => {
  it('sends trust boundaries and shared contracts to Sol', () => {
    for (const file of [
      'src/app/tenant/tenant.interceptor.ts',
      'src/app/api/journey.ts',
      'src/app/journey/journey.service.ts',
      'projects/ui/src/lib/interfaces/story.ts',
      'e2e/tenancy.spec.ts',
      'package.json',
      'stylelint.config.mjs',
    ]) {
      assert.equal(review.routeModel([file], 5), 'gpt-6.2-sol', file);
    }
  });

  it('sends ordinary screens and components to Terra', () => {
    const files = [
      'src/app/journeys/check-in/intro.html',
      'projects/ui/src/lib/primitives/button/button.ts',
    ];
    assert.equal(review.routeModel(files, 40), 'gpt-6.1-terra');
  });

  it('sends a large diff to Sol whatever it touches', () => {
    assert.equal(review.routeModel(['src/app/journeys/x.html'], 601), 'gpt-6.2-sol');
  });
});

const DIFF = `diff --git a/src/a.ts b/src/a.ts
--- a/src/a.ts
+++ b/src/a.ts
@@ -1,3 +1,4 @@
 one
-two
+two changed
+two more
 three
diff --git a/gone.ts b/gone.ts
--- a/gone.ts
+++ /dev/null
@@ -1 +0,0 @@
-bye
`;

describe('parseDiff', () => {
  it('lists the new-file lines a comment can attach to and counts changes', () => {
    const { commentable, changed } = review.parseDiff(DIFF);
    assert.deepEqual([...commentable.get('src/a.ts')], [1, 2, 3, 4]);
    assert.equal(commentable.has('gone.ts'), false);
    assert.equal(changed, 4);
  });
});

describe('buildReview', () => {
  const finding = (file, line) => ({
    file,
    line,
    severity: 'major',
    title: 'T',
    body: 'B',
  });

  it('anchors findings on diff lines and keeps the rest in the summary', () => {
    const { commentable } = review.parseDiff(DIFF);
    const result = {
      summary: 'S',
      findings: [finding('src/a.ts', 2), finding('src/a.ts', 99)],
    };
    const posted = review.buildReview(result, 'gpt-6.1-terra', commentable, 'abc');
    assert.equal(posted.comments.length, 1);
    assert.equal(posted.comments[0].line, 2);
    assert.match(posted.body, /src\/a\.ts:99/);
    assert.equal(posted.event, 'COMMENT');
    assert.equal(posted.commit_id, 'abc');
  });

  it('says so when there are no findings', () => {
    const posted = review.buildReview(
      { summary: 'S', findings: [] },
      'gpt-6.1-terra',
      new Map(),
      'abc',
    );
    assert.match(posted.body, /No findings\./);
  });
});

describe('answeredNotes', () => {
  it('passes on only the author responses', () => {
    const comments = [
      { body: '**Response to Codex review**\n\nDismissed: out of scope.' },
      { body: 'lgtm' },
    ];
    assert.match(review.answeredNotes(comments), /Dismissed: out of scope/);
    assert.doesNotMatch(review.answeredNotes(comments), /lgtm/);
    assert.equal(review.answeredNotes([{ body: 'lgtm' }]), '');
  });
});

describe('usageOf', () => {
  it('reads the last turn.completed event', () => {
    const events =
      '{"type":"turn.started"}\n{"type":"turn.completed","usage":{"input_tokens":10,"cached_input_tokens":4,"output_tokens":2}}\n';
    assert.equal(review.usageOf(events), '10 in (4 cached), 2 out');
    assert.equal(review.usageOf(''), 'usage unknown');
  });
});

describe('reviewTag', () => {
  it('names the model, effort and PR for the banner', () => {
    assert.equal(review.reviewTag('gpt-6.2-sol', '69'), '6.2 Sol Medium | #69');
    assert.equal(review.reviewTag('gpt-6.1-terra', '7'), '6.1 Terra Medium | #7');
  });
});

describe('buildPrompt', () => {
  it('points Codex at the PR and its files without pasting the diff', () => {
    const prompt = review.buildPrompt({
      pr: '665',
      base: 'abc123',
      head: 'def456',
      files: ['src/a.ts', 'docs/b.md'],
      notes: '',
    });
    assert.match(prompt, /pull request #665/);
    assert.match(prompt, /git diff abc123\.\.\.def456 -- <file>/);
    assert.match(prompt, /- src\/a\.ts\n- docs\/b\.md/);
    assert.doesNotMatch(prompt, /^diff --git/m);
    assert.doesNotMatch(prompt, /^@@/m);
  });

  it("carries the author's earlier answers", () => {
    const prompt = review.buildPrompt({
      pr: '1',
      base: 'a',
      head: 'b',
      files: ['x.ts'],
      notes: 'Findings already answered: none.\n\n',
    });
    assert.match(prompt, /Findings already answered: none\./);
  });
});

describe('failureOf', () => {
  it("reports Codex's own error from its event stream", () => {
    const events =
      '{"type":"turn.started"}\n{"type":"turn.failed","error":{"message":"You have hit your usage limit."}}\n';
    assert.equal(review.failureOf(events, 'warning: config'), 'You have hit your usage limit.');
    assert.equal(review.failureOf('', 'plain stderr'), 'plain stderr');
  });
});

describe('parseArgs', () => {
  it('reads one or several PRs, a plan and focus files', () => {
    assert.deepEqual(review.parseArgs(['670']), { prs: ['670'], plan: null, focus: [] });
    assert.deepEqual(review.parseArgs(['670', '671', '--focus', 'a.ts,b.ts']), {
      prs: ['670', '671'],
      plan: null,
      focus: ['a.ts', 'b.ts'],
    });
    assert.deepEqual(review.parseArgs(['--plan', 'docs/features/x.md']), {
      prs: [],
      plan: 'docs/features/x.md',
      focus: [],
    });
    assert.throws(() => review.parseArgs([]), /Usage/);
    assert.throws(() => review.parseArgs(['abc']), /Usage/);
    assert.throws(() => review.parseArgs(['--plan', 'x.md', '670']), /Usage/);
  });
});

describe('focus files', () => {
  it('names the files Codex should start with', () => {
    const prompt = review.buildPrompt({
      pr: '1',
      base: 'a',
      head: 'b',
      files: ['x.ts', 'y.ts'],
      notes: '',
      focus: ['y.ts'],
    });
    assert.match(prompt, /Start with these files:\n- y\.ts/);
    assert.doesNotMatch(
      review.buildPrompt({ pr: '1', base: 'a', head: 'b', files: ['x.ts'], notes: '' }),
      /Start with/,
    );
  });
});

describe('combined review', () => {
  it('says it was one combined review of several PRs', () => {
    const prompt = review.buildPrompt({
      pr: ['670', '671'],
      base: 'a',
      head: 'b',
      files: ['x.ts'],
      notes: '',
    });
    assert.match(prompt, /one combined review of pull requests #670 and #671/);
  });

  it('gives each PR only its own findings, with its own count', () => {
    const result = {
      summary: 's',
      findings: [
        { file: 'a.ts', line: 3, severity: 'major', title: 'A', body: 'a' },
        { file: 'b.ts', line: 4, severity: 'minor', title: 'B', body: 'b' },
        { file: 'b.ts', line: 9, severity: 'minor', title: 'C', body: 'c' },
      ],
    };
    const body = review.combinedReviewBody(
      result,
      'gpt-6.2-sol',
      ['b.ts'],
      ['670', '671'],
      'abcdef1234',
    );
    assert.match(body, /One combined review of #670 and #671/);
    assert.match(body, /2 of 3 findings are on this PR's files/);
    assert.match(body, /\*\*minor: B\*\*/);
    assert.doesNotMatch(body, /\*\*major: A\*\*/);
    assert.match(
      review.combinedReviewBody(result, 'gpt-6.2-sol', ['z.ts'], ['670', '671'], 'abcdef1234'),
      /0 of 3 findings are on this PR's files/,
    );
  });
});

describe('plan review', () => {
  it('points Codex at a contract before any code is built', () => {
    const prompt = review.buildPlanPrompt({ plan: 'docs/features/x.md', focus: ['src/a.ts'] });
    assert.match(prompt, /feature contract docs\/features\/x\.md/);
    assert.match(prompt, /before any code is written/);
    assert.match(prompt, /Start with these files:\n- src\/a\.ts/);
  });

  it('formats plan findings for the terminal', () => {
    const out = review.planReport({
      summary: 'ok',
      findings: [
        { file: 'docs/features/x.md', line: 12, severity: 'major', title: 'T', body: 'b' },
      ],
    });
    assert.match(out, /major: T \(docs\/features\/x\.md:12\)/);
  });
});
