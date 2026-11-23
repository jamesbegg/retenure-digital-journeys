import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import angular from 'angular-eslint';
import boundaries from 'eslint-plugin-boundaries';
import importX, { createNodeResolver } from 'eslint-plugin-import-x';
import tseslint from 'typescript-eslint';

const typesOutsideInterfaces = [
  'TSInterfaceDeclaration',
  'TSTypeAliasDeclaration',
  'TSEnumDeclaration',
  'TSTypeLiteral',
].map((selector) => ({
  selector,
  message: 'Types live in an interfaces/ folder. Move this declaration there and import it.',
}));

const variantInput =
  'PropertyDefinition[key.name=/^(variant|size|tone|state|kind|type|layout|branding)$|Position$/] > CallExpression:matches([callee.name=/^(input|model)$/], [callee.object.name=/^(input|model)$/])';

const signalApis = [
  {
    selector: `${variantInput}:not([typeArguments])`,
    message:
      'Variant inputs need a literal union type argument from interfaces/, e.g. input<ButtonVariant>().',
  },
  {
    selector: `${variantInput} > TSTypeParameterInstantiation TSStringKeyword`,
    message: 'Variant inputs are literal unions, never string.',
  },
  {
    selector: 'Decorator[expression.callee.name=/^(Input|Output)$/]',
    message: 'Use input(), model() and output() signals, not @Input or @Output.',
  },
];

const journeyStyling = [
  {
    selector: 'Decorator Property[key.name="host"]',
    message: 'Journey components take no host styling or listeners. Use a ret-* component.',
  },
  {
    selector: 'Decorator[expression.callee.name=/^Host(Binding|Listener)$/]',
    message: 'Journey components take no host styling or listeners. Use a ret-* component.',
  },
];

const typedFormsOnly = {
  name: '@angular/forms',
  importNames: [
    'FormsModule',
    'NgModel',
    'NgForm',
    'NgModelGroup',
    'UntypedFormControl',
    'UntypedFormGroup',
    'UntypedFormArray',
    'UntypedFormBuilder',
  ],
  message: 'Use typed reactive forms (ReactiveFormsModule, FormControl<T>).',
};

const restrictImports = (...patterns) => [
  'error',
  { paths: [typedFormsOnly], ...(patterns.length && { patterns }) },
];

const layers = ['interfaces', 'utils', 'primitives', 'composites', 'layouts'];
const below = (layer) => layers.slice(0, layers.indexOf(layer) + 1);

export default defineConfig(
  {
    linterOptions: { noInlineConfig: true, reportUnusedDisableDirectives: 'off' },
  },
  {
    ignores: ['dist/', 'out-tsc/', '.angular/', 'playwright-report/', 'test-results/', '.claude/'],
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'ret', style: 'kebab-case' },
      ],
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'ret', style: 'camelCase' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^_' }],
      'no-restricted-imports': restrictImports(),
      'no-restricted-syntax': ['error', ...typesOutsideInterfaces, ...signalApis],
      '@angular-eslint/component-max-inline-declarations': ['error', { styles: 0 }],
    },
  },
  {
    files: ['**/interfaces/**/*.ts', '**/*.spec.ts'],
    rules: { 'no-restricted-syntax': ['error', ...signalApis] },
  },
  {
    files: ['**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@angular-eslint/component-max-inline-declarations': 'off',
    },
  },
  {
    files: ['projects/ui/**/*.ts'],
    plugins: { boundaries, 'import-x': importX },
    settings: {
      'boundaries/elements': [
        ...layers.map((type) => ({
          type,
          pattern: `projects/ui/src/lib/${type}${['interfaces', 'utils'].includes(type) ? '' : '/*'}`,
        })),
      ],
      'boundaries/files': [{ category: 'entry', pattern: 'projects/ui/src/*.ts' }],
      'import/resolver': { node: { extensions: ['.ts'] } },
      'import-x/resolver-next': [createNodeResolver({ extensions: ['.ts'] })],
      'import-x/extensions': ['.ts'],
      'import-x/parsers': { '@typescript-eslint/parser': ['.ts'] },
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          message:
            '{{ from.element.type }} may import only their own layer or a lower one: interfaces, utils, primitives, composites, layouts.',
          policies: [
            { allow: { to: { origin: ['external', 'core'] } } },
            ...layers.map((layer) => ({
              from: { element: { type: layer } },
              allow: { to: { element: { types: below(layer) } } },
            })),
            {
              from: { file: { categories: 'entry' } },
              allow: { to: { element: { types: layers } } },
            },
          ],
        },
      ],
      'boundaries/no-unknown-files': 'error',
      'import-x/no-cycle': 'error',
      'no-restricted-imports': restrictImports(
        {
          group: ['**/src/app/**', '**/src/app'],
          message: 'The UI library imports nothing from the app. Pass data in through inputs.',
        },
        {
          group: ['@retenure/ui', '@retenure/ui/*'],
          message: 'Inside the UI library, import by relative path.',
        },
      ),
    },
  },
  {
    files: ['projects/ui/src/lib/{primitives,composites,layouts}/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...typesOutsideInterfaces,
        ...signalApis,
        {
          selector:
            'Decorator Property[key.name="host"] > ObjectExpression > Property:matches([key.value=/^\\[?class/], [key.name="class"])',
          message:
            "Put host variants in data attributes ('[attr.data-size]'). A parent's .md or .primary style would also match a host class.",
        },
        {
          selector: 'Decorator[expression.callee.name=/^Host(Binding|Listener)$/]',
          message: "Use the component's host metadata, with data attributes for variants.",
        },
      ],
    },
  },
  {
    files: ['src/app/**/*.ts'],
    ignores: ['src/app/gallery/**'],
    rules: {
      'no-restricted-imports': restrictImports({
        group: ['**/projects/**', '@retenure/ui/*'],
        message: 'The app imports UI only from @retenure/ui. Stories belong to the gallery.',
      }),
    },
  },
  {
    files: ['src/app/journeys/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...typesOutsideInterfaces,
        ...signalApis,
        ...journeyStyling,
      ],
      '@angular-eslint/component-max-inline-declarations': ['error', { template: 0, styles: 0 }],
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
  },
);
