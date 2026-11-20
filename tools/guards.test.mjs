import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import stylelint from 'stylelint';
import { checkJourneyTemplate } from './check-journey-templates.mjs';

const eslint = new ESLint();

async function eslintProblems(code, filePath) {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.map((m) => `${m.ruleId}: ${m.message}`);
}

async function stylelintProblems(code, codeFilename) {
  const { results } = await stylelint.lint({ code, codeFilename });
  return results[0].warnings.map((w) => `${w.rule}: ${w.text}`);
}

const templateProblems = async (source, file) => checkJourneyTemplate(source, file);

function guard(name, lint, cases) {
  describe(name, () => {
    for (const { expect, file, bad, good } of cases) {
      it(`fails on the bad example: ${expect}`, async () => {
        const problems = await lint(bad, file);
        assert.ok(
          problems.some((p) => p.includes(expect)),
          `expected "${expect}" for:\n${bad}\ngot: ${JSON.stringify(problems)}`,
        );
      });
      if (good !== undefined) {
        it(`passes on the fix: ${expect}`, async () => {
          assert.deepEqual(await lint(good, file), []);
        });
      }
    }
  });
}

function allowed(name, lint, cases) {
  describe(name, () => {
    for (const { why, file, code } of cases) {
      it(`allows ${why}`, async () => assert.deepEqual(await lint(code, file), []));
    }
  });
}

const component = (meta) =>
  `import { Component } from '@angular/core';\n@Component({ ${meta} })\nexport class X {}\n`;
const directive = (selector) =>
  `import { Directive } from '@angular/core';\n@Directive({ selector: '${selector}' })\nexport class X {}\n`;
const typesRule = 'no-restricted-syntax: Types live in an interfaces/ folder';

guard('ESLint', eslintProblems, [
  {
    expect: '@angular-eslint/component-selector',
    file: 'src/app/x.ts',
    bad: component(`selector: 'app-x', template: ''`),
    good: component(`selector: 'ret-x', template: ''`),
  },
  {
    expect: '@angular-eslint/directive-selector',
    file: 'src/app/x.ts',
    bad: directive('[appX]'),
    good: directive('[retX]'),
  },
  {
    expect: '@typescript-eslint/no-explicit-any',
    file: 'src/app/x.ts',
    bad: 'export const x: any = 1;\n',
    good: 'export const x: unknown = 1;\n',
  },
  {
    expect: 'no-restricted-imports',
    file: 'src/app/x.ts',
    bad: "import { FormsModule } from '@angular/forms';\nexport const m = FormsModule;\n",
    good: "import { ReactiveFormsModule } from '@angular/forms';\nexport const m = ReactiveFormsModule;\n",
  },
  {
    expect: typesRule,
    file: 'src/app/journeys/annual/answer.ts',
    bad: 'export interface Answer { value: string }\n',
    good: "export const answer = 'x';\n",
  },
  {
    expect: typesRule,
    file: 'src/app/x.ts',
    bad: "export type Size = 'md' | 'lg';\n",
  },
  { expect: typesRule, file: 'src/app/x.ts', bad: 'export enum Size { Md, Lg }\n' },
  {
    expect: typesRule,
    file: 'src/app/x.ts',
    bad: "export const x: { a: string } = { a: '' };\n",
  },
  {
    expect: '@angular-eslint/component-max-inline-declarations',
    file: 'src/app/journeys/annual/review.ts',
    bad: component(`selector: 'ret-review', template: '<p>x</p>'`),
    good: component(`selector: 'ret-review', templateUrl: './review.html'`),
  },
  {
    expect: '@typescript-eslint/no-explicit-any',
    file: 'src/app/x.ts',
    bad: '// eslint-disable-next-line @typescript-eslint/no-explicit-any\nexport const x: any = 1;\n',
  },
  {
    expect: 'no-restricted-imports',
    file: 'src/app/x.ts',
    bad: "import { UntypedFormGroup } from '@angular/forms';\nexport const g = UntypedFormGroup;\n",
  },
  {
    expect: 'no-restricted-imports',
    file: 'src/app/x.ts',
    bad: "import { NgModel } from '@angular/forms';\nexport const m = NgModel;\n",
  },
  {
    expect: '@angular-eslint/component-max-inline-declarations',
    file: 'src/app/x.ts',
    bad: component(`selector: 'ret-x', template: '', styles: 'p { color: red; }'`),
    good: component(`selector: 'ret-x', template: '', styleUrl: './x.scss'`),
  },
  {
    expect: 'no-restricted-syntax: Journey components take no host styling',
    file: 'src/app/journeys/annual/review.ts',
    bad: component(
      `selector: 'ret-review', templateUrl: './review.html', host: { class: 'ret-surface' }`,
    ),
  },
  {
    expect: 'no-restricted-syntax: Journey components take no host styling',
    file: 'src/app/journeys/annual/review.ts',
    bad: "import { Component, HostBinding } from '@angular/core';\n@Component({ selector: 'ret-review', templateUrl: './review.html' })\nexport class X {\n  @HostBinding('class') c = 'ret-surface';\n}\n",
  },
  {
    expect: '@angular-eslint/template/alt-text',
    file: 'src/app/x.html',
    bad: '<img src="a.png" />\n',
    good: '<img src="a.png" alt="" />\n',
  },
]);

allowed('ESLint exceptions', eslintProblems, [
  {
    why: 'an interface in interfaces/',
    file: 'src/app/interfaces/answer.ts',
    code: 'export interface Answer { value: string }\n',
  },
  {
    why: 'a type alias in interfaces/',
    file: 'src/app/interfaces/size.ts',
    code: "export type Size = 'md' | 'lg';\n",
  },
  {
    why: 'any and local types in a spec',
    file: 'src/app/x.spec.ts',
    code: 'interface Host { v: string }\nexport const h: Host = { v: 1 as any };\n',
  },
]);

const componentScss = 'projects/ui/src/lib/primitives/button/button.scss';
const journeyScss = 'src/app/journeys/annual/review.scss';
const rule = (declaration) => `a {\n  ${declaration};\n}\n`;

guard('stylelint', stylelintProblems, [
  {
    expect: 'color-no-hex',
    file: componentScss,
    bad: rule('color: #123456'),
    good: rule('color: var(--ret-color-text)'),
  },
  { expect: 'color-named', file: componentScss, bad: rule('color: red') },
  { expect: 'function-disallowed-list', file: componentScss, bad: rule('color: rgb(0 0 0)') },
  {
    expect: 'declaration-property-unit-disallowed-list',
    file: componentScss,
    bad: rule('font-size: 14px'),
    good: rule('font-size: 0.875rem'),
  },
  {
    expect: 'declaration-property-unit-disallowed-list',
    file: componentScss,
    bad: rule('line-height: 20px'),
    good: rule('line-height: 1.5'),
  },
  {
    expect: 'declaration-property-unit-disallowed-list',
    file: componentScss,
    bad: rule('font: 14px/20px sans-serif'),
    good: rule('font: 1rem/1.5 sans-serif'),
  },
  {
    expect: 'declaration-property-unit-disallowed-list',
    file: componentScss,
    bad: rule('font-size: 4vw'),
  },
  {
    expect: 'declaration-property-value-disallowed-list',
    file: componentScss,
    bad: rule('outline: solid 0'),
  },
  {
    expect: 'declaration-property-value-disallowed-list',
    file: componentScss,
    bad: rule('outline-color: transparent'),
  },
  {
    expect: 'color-no-hex',
    file: componentScss,
    bad: '/* stylelint-disable */\na {\n  color: #123456;\n}\n',
  },
  {
    expect: 'declaration-property-unit-disallowed-list',
    file: journeyScss,
    bad: rule('font-size: 14px'),
  },
  {
    expect: 'declaration-property-value-disallowed-list',
    file: componentScss,
    bad: rule('outline: none'),
    good: rule('outline: 0.125rem solid var(--ret-color-focus)'),
  },
  {
    expect: 'declaration-property-value-disallowed-list',
    file: componentScss,
    bad: rule('outline: 0'),
  },
  {
    expect: 'declaration-property-value-disallowed-list',
    file: componentScss,
    bad: rule('outline-width: 0'),
    good: rule('outline-width: 0.125rem'),
  },
  {
    expect: 'declaration-property-value-disallowed-list',
    file: componentScss,
    bad: rule('outline-style: none'),
  },
  {
    expect: 'declaration-property-value-disallowed-list',
    file: componentScss,
    bad: rule('text-transform: uppercase'),
    good: rule('text-transform: none'),
  },
  {
    expect: 'property-allowed-list',
    file: journeyScss,
    bad: rule('color: var(--ret-color-text)'),
    good: 'section {\n  display: grid;\n  gap: 1rem;\n}\n',
  },
  {
    expect: 'property-allowed-list',
    file: journeyScss,
    bad: rule('--ret-brand-primary: var(--ret-color-text)'),
    good: rule('margin-block: 1rem'),
  },
  {
    expect: 'selector-pseudo-element-disallowed-list',
    file: journeyScss,
    bad: '::ng-deep section {\n  display: grid;\n}\n',
  },
  {
    expect: 'at-rule-disallowed-list',
    file: journeyScss,
    bad: 'section {\n  @include surface;\n}\n',
  },
]);

allowed('stylelint exceptions', stylelintProblems, [
  {
    why: 'a colour literal in tokens',
    file: 'projects/ui/src/lib/tokens/x.scss',
    code: ':root {\n  --ret-x: #123456;\n}\n',
  },
]);

guard('journey template check', templateProblems, [
  { expect: '<div> line 1: use a ret-*', bad: '<div></div>' },
  { expect: '<h1> line 1: use a ret-*', bad: '<h1>Title</h1>', good: '<h2>Title</h2>' },
  { expect: '<ng-container> line 1: use a ret-*', bad: '<ng-container></ng-container>' },
  { expect: 'not ng-template', bad: '<ng-template><p>x</p></ng-template>' },
  { expect: 'structural directive', bad: '<p *ngIf="x">x</p>', good: '@if (x) {<p>x</p>}' },
  { expect: 'no inline style', bad: '<p style="margin: 0">x</p>' },
  { expect: 'no [style.color]', bad: '<ret-card [style.color]="c" />' },
  { expect: 'no [class.big]', bad: '<ret-card [class.big]="b" />' },
  { expect: 'no [ngStyle]', bad: '<ret-card [ngStyle]="s" />' },
  { expect: 'no [innerHTML]', bad: '<p [innerHTML]="html"></p>' },
  { expect: 'no [className]', bad: '<ret-card [className]="c" />' },
  {
    expect: 'ret-* classes belong',
    bad: '<section class="ret-surface"></section>',
    good: '<section class="cards"></section>',
  },
  { expect: 'static attributes only', bad: '<section [attr.role]="r"></section>' },
  { expect: 'take no events', bad: '<p (click)="go()">Go</p>' },
  {
    expect: 'no (input) plumbing',
    bad: '<ret-text-field (input)="set($event)" />',
    good: '<ret-text-field formControlName="name" [variant]="v" (blur)="touch()" />',
  },
  { expect: 'no (change) plumbing', bad: '<ret-radio-group (change)="set($event)" />' },
]);

allowed('journey template check exceptions', templateProblems, [
  {
    why: 'ret-* components, allowed tags, control flow and a reactive form',
    file: 'x.html',
    code: `<form [formGroup]="form" (ngSubmit)="save()">
  <section class="cards">
    <h2>Your plans</h2>
    <p>One line.</p>
    @if (ready) {
      <ret-yes-no formControlName="care" label="Any care needs?" />
    }
    <ul><li>Goal</li></ul>
  </section>
</form>`,
  },
]);

describe('journey template check CLI', () => {
  const script = fileURLToPath(new URL('./check-journey-templates.mjs', import.meta.url));

  function run(html, via = () => script) {
    const root = mkdtempSync(join(tmpdir(), 'journey check '));
    try {
      mkdirSync(join(root, 'src/app/journeys/annual'), { recursive: true });
      writeFileSync(join(root, 'src/app/journeys/annual/review.html'), html);
      return spawnSync(process.execPath, [via(root)], { cwd: root, encoding: 'utf8' });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }

  it('exits 1 and names the file for a bad journey template', () => {
    const { status, stderr } = run('<div></div>');
    assert.equal(status, 1);
    assert.match(stderr, /src\/app\/journeys\/annual\/review\.html <div>/);
  });

  it('still checks when run through a symlink in a path with a space', () => {
    const viaLink = (root) => {
      const link = join(root, 'check link.mjs');
      symlinkSync(script, link);
      return link;
    };
    assert.equal(run('<div></div>', viaLink).status, 1);
  });

  it('exits 0 for a good journey template', () => {
    assert.equal(run('<h2>Your plans</h2>').status, 0);
  });
});
