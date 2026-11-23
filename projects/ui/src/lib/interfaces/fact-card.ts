import { FormControl } from '@angular/forms';
import { HeldFact } from './question';

export type FactCardVariant = 'question' | 'summary';

export interface FactCardField {
  fact: HeldFact;
  control: FormControl<string>;
}
