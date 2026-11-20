import { Component, input, model } from '@angular/core';
import { Variants } from './story';

type Actions =
  { kind: 'single'; primary: string } | { kind: 'pair'; primary: string; secondary: string };

@Component({ selector: 'ret-example', template: '' })
class Example {
  variant = input<'primary' | 'ghost'>('primary');
  size = input<'md' | 'lg' | undefined>();
  label = input.required<string>();
  pending = input(false);
  actions = input.required<Actions>();
  value = model('');
  open = model(false);
}

const complete: Variants<Example> = {
  variant: { primary: 'Main action', ghost: 'Inside cards' },
  size: { md: 'Medium', lg: 'Large' },
  pending: 'Busy',
  actions: { single: 'One action', pair: 'Two actions' },
  open: 'Expanded',
};

// The proof is type-level: npm run typecheck fails if any @ts-expect-error line stops erroring.
describe('Variants', () => {
  it('accepts a story that lists every union value, kind and flag', () => {
    expect(complete).toBeDefined();
  });

  it('rejects a story that misses or invents a variant', () => {
    // @ts-expect-error missing the ghost variant
    const missingValue: Variants<Example> = { ...complete, variant: { primary: 'Main' } };
    // @ts-expect-error missing the pair kind
    const missingKind: Variants<Example> = { ...complete, actions: { single: 'One' } };
    const { pending: _p, ...noPending } = complete;
    // @ts-expect-error missing the pending flag
    const missingFlag: Variants<Example> = noPending;
    const { actions: _a, ...noActions } = complete;
    // @ts-expect-error missing the actions input
    const missingInput: Variants<Example> = noActions;
    // @ts-expect-error a flag takes a description, not values
    const flagAsRecord: Variants<Example> = { ...complete, open: { yes: 'Open' } };
    // @ts-expect-error label is free text, not a variant
    const freeText: Variants<Example> = { ...complete, label: 'Label' };
    const extra: Variants<Example> = {
      ...complete,
      // @ts-expect-error danger is not a variant
      variant: { primary: 'Main', ghost: 'Cards', danger: 'Bad' },
    };
    expect([
      missingValue,
      missingKind,
      missingFlag,
      missingInput,
      flagAsRecord,
      freeText,
      extra,
    ]).toBeDefined();
  });
});
