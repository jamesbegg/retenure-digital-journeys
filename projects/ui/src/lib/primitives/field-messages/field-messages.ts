import { Component, input } from '@angular/core';
import { Icon } from '../icon/icon';

@Component({
  selector: 'ret-field-messages',
  imports: [Icon],
  templateUrl: './field-messages.html',
  styleUrl: './field-messages.scss',
})
export class FieldMessages {
  readonly fieldId = input.required<string>();
  readonly hint = input<string>();
  readonly error = input<string>();
  readonly errorPrefix = input('Error:');
}
