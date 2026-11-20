import { InputSignalWithTransform, ModelSignal } from '@angular/core';

type InputValue<T> =
  T extends InputSignalWithTransform<infer V, infer _W>
    ? V
    : T extends ModelSignal<infer M>
      ? M
      : never;

type VariantKind<V> = [NonNullable<V>] extends [never]
  ? never
  : [NonNullable<V>] extends [boolean]
    ? 'flag'
    : [NonNullable<V>] extends [string]
      ? string extends NonNullable<V>
        ? never
        : 'union'
      : [NonNullable<V>] extends [{ kind: string }]
        ? 'kind'
        : never;

type Described<V> =
  VariantKind<V> extends 'flag'
    ? string
    : VariantKind<V> extends 'union'
      ? Record<NonNullable<V> & string, string>
      : Record<NonNullable<V> extends { kind: infer K } ? K & string : never, string>;

/**
 * Every literal-union, `kind`-union and boolean input of a component, each with a description.
 * A story declares one, so a new variant fails typecheck until the story shows it.
 */
export type Variants<C> = {
  [K in keyof C as VariantKind<InputValue<C[K]>> extends never ? never : K]-?: Described<
    InputValue<C[K]>
  >;
};
