import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  answeredNotes,
  buildReview,
  parseDiff,
  reviewTag,
  routeModel,
  usageOf,
} from './codex-review.mjs';

const DIFF = `diff --git a/src/app/a.ts b/src/app/a.ts
--- a/src/app/a.ts
+++ b/src/app/a.ts
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
      assert.equal(routeModel([file], 5), 'gpt-6.2-sol', file);
    }
  });

  it('sends ordinary screens and components to Terra', () => {
    const files = [
      'src/app/journeys/check-in/intro.html',
      'projects/ui/src/lib/primitives/button/button.ts',
    ];
    assert.equal(routeModel(files, 40), 'gpt-6.1-terra');
  });

  it('sends a large diff to Sol whatever it touches', () => {
    assert.equal(routeModel(['src/app/journeys/x.html'], 601), 'gpt-6.2-sol');
  });
});

describe('parseDiff', () => {
  it('lists the new-file lines a comment can attach to and counts changes', () => {
    const { commentable, changed } = parseDiff(DIFF);
    assert.deepEqual([...commentable.get('src/app/a.ts')], [1, 2, 3, 4]);
    assert.equal(commentable.has('gone.ts'), false);
    assert.equal(changed, 4);
  });
});

describe('buildReview', () => {
  const finding = (file, line) => ({ file, line, severity: 'major', title: 'T', body: 'B' });
  const { commentable } = parseDiff(DIFF);

  it('anchors findings on diff lines and keeps the rest in the summary', () => {
    const result = {
      summary: 'S',
      findings: [finding('src/app/a.ts', 2), finding('src/app/a.ts', 99)],
    };
    const review = buildReview(result, 'gpt-6.1-terra', commentable, 'abc');
    assert.equal(review.comments.length, 1);
    assert.equal(review.comments[0].line, 2);
    assert.match(review.body, /src\/app\/a\.ts:99/);
    assert.equal(review.event, 'COMMENT');
    assert.equal(review.commit_id, 'abc');
  });

  it('says so when there are no findings', () => {
    const review = buildReview({ summary: 'S', findings: [] }, 'gpt-6.1-terra', commentable, 'abc');
    assert.match(review.body, /No findings\./);
  });
});

describe('answeredNotes', () => {
  it('passes on only the author responses', () => {
    const comments = [
      { body: '**Response to Codex review**\n\nDismissed: out of scope.' },
      { body: 'lgtm' },
    ];
    assert.match(answeredNotes(comments), /Dismissed: out of scope/);
    assert.doesNotMatch(answeredNotes(comments), /lgtm/);
    assert.equal(answeredNotes([{ body: 'lgtm' }]), '');
  });
});

describe('usageOf', () => {
  it('reads the last turn.completed event', () => {
    const events =
      '{"type":"turn.started"}\n{"type":"turn.completed","usage":{"input_tokens":10,"cached_input_tokens":4,"output_tokens":2}}\n';
    assert.equal(usageOf(events), '10 in (4 cached), 2 out');
    assert.equal(usageOf(''), 'usage unknown');
  });
});

describe('reviewTag', () => {
  it('names the model, effort and PR for the banner', () => {
    assert.equal(reviewTag('gpt-6.2-sol', '69'), '6.2 Sol Medium | #69');
    assert.equal(reviewTag('gpt-6.1-terra', '7'), '6.1 Terra Medium | #7');
  });
});
