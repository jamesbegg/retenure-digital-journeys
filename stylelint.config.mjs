const tokensOnly = 'Colours live in projects/ui/src/lib/tokens. Use a var(--ret-*) token.';

export default {
  ignoreDisables: true,
  ignoreFiles: ['dist/**', 'out-tsc/**', '.angular/**', 'playwright-report/**', '.claude/**'],
  extends: ['stylelint-config-standard-scss'],
  rules: {
    'custom-property-empty-line-before': null,
    'color-no-hex': [true, { message: tokensOnly }],
    'color-named': ['never', { message: tokensOnly }],
    'function-disallowed-list': [
      ['rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'lab', 'lch', 'oklab', 'oklch', 'color'],
      { message: tokensOnly },
    ],
    'declaration-property-unit-disallowed-list': [
      {
        'font-size': ['px', 'pt', 'vw', 'vh', 'vmin', 'vmax'],
        font: ['px', 'pt', 'vw', 'vh', 'vmin', 'vmax'],
        'line-height': ['px', 'pt'],
      },
      { message: 'Size text in rem so it scales with the browser text size.' },
    ],
    'declaration-property-value-disallowed-list': [
      {
        outline: ['/(^|\\s)(none|0)(\\s|$)/'],
        'outline-color': ['transparent'],
        'outline-width': ['/^0([a-z]*)$/'],
        'outline-style': ['none'],
        'text-transform': ['uppercase'],
      },
      {
        message:
          'Keep the global focus ring (no outline none or 0) and sentence case (no uppercase).',
      },
    ],
  },
  overrides: [
    {
      files: ['projects/ui/src/lib/tokens/**/*.scss'],
      rules: { 'color-no-hex': null, 'color-named': null, 'function-disallowed-list': null },
    },
    {
      files: ['projects/ui/src/lib/**/*.scss'],
      rules: {
        'selector-disallowed-list': [
          ['/:host\\([^)]*(\\.|class)/'],
          {
            message: "Style host variants by data attribute (:host([data-size='lg'])), not class.",
          },
        ],
      },
    },
    {
      files: ['src/app/journeys/**/*.scss'],
      rules: {
        'property-allowed-list': [
          ['display', '/^grid/', '/^flex/', 'gap', 'row-gap', 'column-gap', '/^margin/', 'order'],
          { message: 'Journey styles set layout only. Anything visual is a component variant.' },
        ],
        'selector-pseudo-element-disallowed-list': [
          ['ng-deep'],
          { message: 'Journey styles cannot reach into components. Add a variant instead.' },
        ],
        'at-rule-disallowed-list': [
          ['include', 'extend', 'mixin', 'use', 'forward', 'import'],
          { message: 'Journey styles set layout only, with no mixins or imports.' },
        ],
      },
    },
  ],
};
