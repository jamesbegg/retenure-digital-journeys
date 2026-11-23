import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, describe, it } from 'node:test';
import { ESLint } from 'eslint';
import stylelint from 'stylelint';
import { checkDist } from './check-dist.mjs';
import { checkUiFiles } from './check-ui-files.mjs';

const eslint = new ESLint();

async function problems(code, filePath) {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.map((m) => `${m.ruleId}: ${m.message}`);
}

// boundaries classifies files from disk, so these cases run in a throwaway copy of the layout.
const sandbox = realpathSync(mkdtempSync(join(tmpdir(), 'ui-guards-')));
const sandboxEslint = new ESLint({
  cwd: sandbox,
  overrideConfigFile: fileURLToPath(new URL('../eslint.config.mjs', import.meta.url)),
});
after(() => rmSync(sandbox, { recursive: true, force: true }));

function writeSandbox(file, code) {
  mkdirSync(dirname(join(sandbox, file)), { recursive: true });
  writeFileSync(join(sandbox, file), code);
}

async function problemsOnDisk(code, file) {
  writeSandbox(file, code);
  const [result] = await sandboxEslint.lintFiles([join(sandbox, file)]);
  return result.messages.map((m) => `${m.ruleId}: ${m.message}`);
}

const component = (body, imports = '') =>
  `import { Component, input${body.includes('model') ? ', model' : ''} } from '@angular/core';\n${imports}@Component({ selector: 'ret-x', template: '' })\nexport class X {\n${body}\n}\n`;
const primitive = 'projects/ui/src/lib/primitives/button/button.ts';

function expectProblem(name, file, code, expected, lint = problems) {
  it(name, async () => {
    const found = await lint(code, file);
    assert.ok(
      found.some((p) => p.includes(expected)),
      `expected "${expected}", got ${JSON.stringify(found)}`,
    );
  });
}

function expectClean(name, file, code, lint = problems) {
  it(name, async () => assert.deepEqual(await lint(code, file), []));
}

describe('layer boundaries', () => {
  const lib = 'projects/ui/src/lib';
  const files = {
    [`${lib}/primitives/zz-low/zz-low.ts`]: "export const low = 'low';\n",
    [`${lib}/composites/zz-high/zz-high.ts`]: "export const high = 'high';\n",
    [`${lib}/layouts/zz-shell/zz-shell.ts`]: "export const shell = 'shell';\n",
    [`${lib}/primitives/zz-ring-a/zz-ring-a.ts`]:
      "import { b } from '../zz-ring-b/zz-ring-b';\nexport const a = () => b;\n",
    [`${lib}/primitives/zz-ring-b/zz-ring-b.ts`]:
      "import { a } from '../zz-ring-a/zz-ring-a';\nexport const b = () => a;\n",
  };
  const repo = process.cwd();
  before(() => {
    Object.entries(files).forEach(([file, code]) => writeSandbox(file, code));
    process.chdir(sandbox);
  });
  after(() => process.chdir(repo));

  expectProblem(
    'fails a primitive importing a composite',
    `${lib}/primitives/zz-x/zz-x.ts`,
    "import { high } from '../../composites/zz-high/zz-high';\nexport const x = high;\n",
    'boundaries/dependencies: primitives may import only their own layer or a lower one',
    problemsOnDisk,
  );
  expectClean(
    'passes a composite importing a primitive, and Angular',
    `${lib}/composites/zz-x/zz-x.ts`,
    "import { Component } from '@angular/core';\nimport { low } from '../../primitives/zz-low/zz-low';\nexport const x = [low, Component];\n",
    problemsOnDisk,
  );
  expectClean(
    'passes a primitive importing another primitive',
    `${lib}/primitives/zz-x/zz-x.ts`,
    "import { low } from '../zz-low/zz-low';\nexport const x = low;\n",
    problemsOnDisk,
  );
  expectProblem(
    'fails a composite importing a layout',
    `${lib}/composites/zz-x/zz-x.ts`,
    "import { shell } from '../../layouts/zz-shell/zz-shell';\nexport const x = shell;\n",
    'boundaries/dependencies: composites may import only',
    problemsOnDisk,
  );
  expectProblem(
    'fails interfaces importing a primitive',
    `${lib}/interfaces/zz-x.ts`,
    "import { low } from '../primitives/zz-low/zz-low';\nexport const x = low;\n",
    'boundaries/dependencies: interfaces may import only',
    problemsOnDisk,
  );
  expectClean(
    'passes a layout importing a composite',
    `${lib}/layouts/zz-x/zz-x.ts`,
    "import { high } from '../../composites/zz-high/zz-high';\nexport const x = high;\n",
    problemsOnDisk,
  );
  expectClean(
    'passes an entry file importing any layer',
    'projects/ui/src/zz-entry.ts',
    "import { shell } from './lib/layouts/zz-shell/zz-shell';\nexport const x = shell;\n",
    problemsOnDisk,
  );
  expectProblem(
    'fails an import cycle inside a layer',
    `${lib}/primitives/zz-ring-a/zz-ring-a.ts`,
    files[`${lib}/primitives/zz-ring-a/zz-ring-a.ts`],
    'import-x/no-cycle',
    problemsOnDisk,
  );
  expectProblem(
    'fails a file outside the known layers',
    `${lib}/widgets/x.ts`,
    'export const x = 1;\n',
    'boundaries/no-unknown-files',
    problemsOnDisk,
  );
});

describe('import bans', () => {
  expectProblem(
    'fails the UI library importing the app',
    primitive,
    "import { App } from '../../../../../../src/app/app';\nexport const x = App;\n",
    'The UI library imports nothing from the app',
  );
  expectProblem(
    'fails the UI library importing itself by package name',
    primitive,
    "import { stories } from '@retenure/ui/stories';\nexport const x = stories;\n",
    'Inside the UI library, import by relative path',
  );
  expectProblem(
    'fails a journey deep-importing the library',
    'src/app/journeys/annual/review.ts',
    "import { stories } from '@retenure/ui/stories';\nexport const x = stories;\n",
    'The app imports UI only from @retenure/ui',
  );
  expectProblem(
    'fails a journey importing the library by path',
    'src/app/journeys/annual/review.ts',
    "import { x } from '../../../../projects/ui/src/public-api';\nexport const y = x;\n",
    'The app imports UI only from @retenure/ui',
  );
  expectClean(
    'passes a journey importing @retenure/ui',
    'src/app/journeys/annual/review.ts',
    "import { stories } from '@retenure/ui';\nexport const x = stories;\n",
  );
});

describe('signal inputs', () => {
  const literal = 'Variant inputs need a literal union type argument';
  expectProblem(
    'fails an untyped variant input',
    primitive,
    component("  variant = input('primary');"),
    literal,
  );
  expectProblem(
    'fails an untyped required size',
    primitive,
    component('  size = input.required();'),
    literal,
  );
  expectProblem(
    'fails an untyped model',
    primitive,
    component("  state = model('open');"),
    literal,
  );
  expectProblem(
    'fails an untyped *Position input',
    primitive,
    component("  iconPosition = input('leading');"),
    literal,
  );
  expectProblem(
    'fails an untyped required model',
    primitive,
    component('  state = model.required();'),
    literal,
  );
  expectProblem(
    'fails the renderer deep-importing the library',
    'src/app/engine/renderer.ts',
    "import { stories } from '@retenure/ui/stories';\nexport const x = stories;\n",
    'The app imports UI only from @retenure/ui',
  );
  expectClean(
    'passes the gallery importing stories',
    'src/app/gallery/gallery-index.ts',
    "import { stories } from '@retenure/ui/stories';\nexport const x = stories;\n",
  );
  expectProblem(
    'fails a string variant input',
    primitive,
    component("  variant = input<string>('primary');"),
    'Variant inputs are literal unions, never string',
  );
  expectProblem(
    'fails a variant union widened with string',
    primitive,
    component(
      "  tone = input<ButtonTone | string>('info');",
      "import { ButtonTone } from '../../interfaces/button';\n",
    ),
    'Variant inputs are literal unions, never string',
  );
  expectProblem(
    'fails @Input',
    primitive,
    "import { Component, Input } from '@angular/core';\n@Component({ selector: 'ret-x', template: '' })\nexport class X {\n  @Input() label = '';\n}\n",
    'Use input(), model() and output() signals',
  );
  expectProblem(
    'fails a variant input widened with string and undefined',
    primitive,
    component('  size = input<string | undefined>();'),
    'Variant inputs are literal unions, never string',
  );
  expectProblem(
    'fails an untyped variant input in a journey screen',
    'src/app/journeys/annual/review.ts',
    "import { Component, input } from '@angular/core';\n@Component({ selector: 'ret-review', templateUrl: './review.html' })\nexport class X {\n  readonly variant = input('x');\n}\n",
    'Variant inputs need a literal union type argument',
  );
  expectProblem(
    'fails @Output',
    primitive,
    "import { Component, EventEmitter, Output } from '@angular/core';\n@Component({ selector: 'ret-x', template: '' })\nexport class X {\n  @Output() changed = new EventEmitter<string>();\n}\n",
    'Use input(), model() and output() signals',
  );
  expectClean(
    'passes a literal union input and a free-text input',
    primitive,
    component(
      "  variant = input<ButtonVariant>('primary');\n  label = input.required<string>();",
      "import { ButtonVariant } from '../../interfaces/button';\n",
    ),
  );
});

function tree(files) {
  const root = mkdtempSync(join(tmpdir(), 'ui-files-'));
  for (const [file, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), text);
  }
  return root;
}

describe('host variants', () => {
  expectProblem(
    'fails a host class binding in a UI component',
    primitive,
    "import { Component, input } from '@angular/core';\n@Component({ selector: 'ret-x', template: '', host: { '[class]': 'size()' } })\nexport class X {\n  size = input<ButtonSize>('md');\n}\n",
    'Put host variants in data attributes',
  );
  expectProblem(
    'fails a static host class',
    primitive,
    "import { Component } from '@angular/core';\n@Component({ selector: 'ret-x', template: '', host: { class: 'md' } })\nexport class X {}\n",
    'Put host variants in data attributes',
  );
  expectProblem(
    'fails @HostBinding',
    primitive,
    "import { Component, HostBinding } from '@angular/core';\n@Component({ selector: 'ret-x', template: '' })\nexport class X {\n  @HostBinding('class.md') md = true;\n}\n",
    "Use the component's host metadata",
  );
  expectClean(
    'passes a host data attribute',
    primitive,
    "import { Component, input } from '@angular/core';\nimport { ButtonSize } from '../../interfaces/button';\n@Component({ selector: 'ret-x', template: '', host: { '[attr.data-size]': 'size()' } })\nexport class X {\n  size = input<ButtonSize>('md');\n}\n",
  );
  it('fails a :host(.class) selector and passes a data attribute one', async () => {
    const lint = async (code) =>
      (
        await stylelint.lint({ code, codeFilename: 'projects/ui/src/lib/primitives/x/x.scss' })
      ).results[0].warnings.map((w) => w.rule);
    assert.ok(
      (await lint(':host(.lg) {\n  display: block;\n}\n')).includes('selector-disallowed-list'),
    );
    assert.ok(
      (await lint(':host(:not(.md)) .label {\n  display: block;\n}\n')).includes(
        'selector-disallowed-list',
      ),
    );
    assert.deepEqual(await lint(":host([data-size='lg']) {\n  display: block;\n}\n"), []);
  });
});

describe('check-ui-files', () => {
  const dir = 'projects/ui/src/lib/primitives/button';
  const complete = {
    'projects/ui/src/stories.ts':
      "export const stories = { button: () => import('./lib/primitives/button/button.story') };\n",
    [`${dir}/button.ts`]: 'export class Button {}\n',
    [`${dir}/button.spec.ts`]: '',
    [`${dir}/button.story.ts`]: 'const variants: Variants<Button> = {};\n',
  };
  const run = (files) => {
    const root = tree(files);
    try {
      return checkUiFiles(root);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  };
  const without = (file) =>
    Object.fromEntries(Object.entries(complete).filter(([f]) => f !== file));

  it('passes a component with spec, story, Variants and registration', () =>
    assert.deepEqual(run(complete), []));
  it('fails a missing spec', () =>
    assert.match(run(without(`${dir}/button.spec.ts`)).join(), /add .*button\.spec\.ts/));
  it('fails a missing story', () =>
    assert.match(run(without(`${dir}/button.story.ts`)).join(), /add .*button\.story\.ts/));
  it('fails a story without Variants of its own class', () =>
    assert.match(
      run({ ...complete, [`${dir}/button.story.ts`]: 'const v: Variants<Card> = {};\n' }).join(),
      /declare Variants<Button>/,
    ));
  it('fails a story that casts or loosens its Variants', () => {
    for (const story of [
      'const v = {} as Variants<Button>;\n',
      'const v: Partial<Variants<Button>> = {};\n',
    ]) {
      assert.match(
        run({ ...complete, [`${dir}/button.story.ts`]: story }).join(),
        /declare Variants<Button>/,
      );
    }
  });
  it('fails a story missing from the registry', () =>
    assert.match(
      run({ ...complete, 'projects/ui/src/stories.ts': 'export const stories = {};\n' }).join(),
      /register 'button'/,
    ));
  it('fails a registry entry that is only a comment', () =>
    assert.match(
      run({
        ...complete,
        'projects/ui/src/stories.ts':
          "export const stories = {\n  // button: () => import('./lib/primitives/button/button.story'),\n};\n",
      }).join(),
      /register 'button'/,
    ));
  it('fails a registry entry under the wrong name', () =>
    assert.match(
      run({
        ...complete,
        'projects/ui/src/stories.ts':
          "export const stories = { card: () => import('./lib/primitives/button/button.story') };\n",
      }).join(),
      /register 'button'/,
    ));
  it('fails a layout missing its spec', () => {
    const shell = 'projects/ui/src/lib/layouts/journey-shell';
    const errors = run({
      ...complete,
      'projects/ui/src/stories.ts':
        "export const stories = {\n  button: () => import('./lib/primitives/button/button.story'),\n  'journey-shell': () => import('./lib/layouts/journey-shell/journey-shell.story'),\n};\n",
      [`${shell}/journey-shell.ts`]: 'export class JourneyShell {}\n',
      [`${shell}/journey-shell.story.ts`]: 'const v: Variants<JourneyShell> = {};\n',
    });
    assert.match(errors.join(), /add .*journey-shell\.spec\.ts/);
    assert.equal(errors.length, 1, errors.join());
  });
  it('fails a component file with no exported class', () =>
    assert.match(
      run({ ...complete, [`${dir}/button.ts`]: 'export const x = 1;\n' }).join(),
      /export the component class/,
    ));
  it('fails a component file not named after its folder', () =>
    assert.match(
      run({
        ...without(`${dir}/button.ts`),
        [`${dir}/index.ts`]: 'export class Button {}\n',
      }).join(),
      /add .*button\.ts/,
    ));
});

describe('check-dist', () => {
  it('fails a build containing the gallery or a synthetic firm', () => {
    const root = tree({
      'main.js': 'const firm = "Hartwell Wealth"; customElements; "ret-gallery";',
    });
    try {
      const errors = checkDist(root).join();
      assert.match(errors, /Hartwell/);
      assert.match(errors, /ret-gallery/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  it('fails a build containing the dev mock', () => {
    const root = tree({ 'main.js': 'console.info("[ret-dev-mock] submission");' });
    try {
      assert.match(checkDist(root).join(), /ret-dev-mock/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  it('fails a synthetic name in a nested html or css file', () => {
    const root = tree({
      'main.js': '',
      'media/index.html': 'Northgate Planning',
      'a/b.css': '/* Priya Shah */',
    });
    try {
      const errors = checkDist(root).join();
      assert.match(errors, /Northgate/);
      assert.match(errors, /Priya Shah/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  it('fails when there is no build output', () =>
    assert.match(checkDist(join(tmpdir(), 'no-such-dist')).join(), /no build output/));
  it('passes a clean build', () => {
    const root = tree({ 'main.js': 'const app = "ret-root";' });
    try {
      assert.deepEqual(checkDist(root), []);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
