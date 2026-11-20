import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import angular from 'angular-eslint';
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

export default defineConfig(
  {
    linterOptions: { noInlineConfig: true, reportUnusedDisableDirectives: 'off' },
  },
  {
    ignores: ['dist/', 'out-tsc/', '.angular/', 'playwright-report/', 'test-results/'],
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
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
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
            },
          ],
        },
      ],
      'no-restricted-syntax': ['error', ...typesOutsideInterfaces],
      '@angular-eslint/component-max-inline-declarations': ['error', { styles: 0 }],
    },
  },
  {
    files: ['**/interfaces/**/*.ts', '**/*.spec.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    files: ['**/*.spec.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
  {
    files: ['src/app/journeys/**/*.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...typesOutsideInterfaces, ...journeyStyling],
      '@angular-eslint/component-max-inline-declarations': ['error', { template: 0, styles: 0 }],
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
  },
);
