import { Component, computed, input, signal } from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';
import { IconName } from '../../interfaces/icon';
import { YesNoVariant } from '../../interfaces/yes-no';
import { describedBy } from '../../utils/described-by';
import { provideValueAccessor } from '../../utils/forms';
import { nextId } from '../../utils/id';
import { FieldMessages } from '../field-messages/field-messages';
import { Icon } from '../icon/icon';

@Component({
  selector: 'ret-yes-no',
  imports: [FieldMessages, Icon],
  templateUrl: './yes-no.html',
  styleUrl: './yes-no.scss',
  providers: [provideValueAccessor(() => YesNo)],
})
export class YesNo implements ControlValueAccessor {
  readonly label = input.required<string>();
  readonly hint = input<string>();
  readonly error = input<string>();
  readonly variant = input<YesNoVariant>('standalone');
  readonly icon = input<IconName>();
  readonly yesLabel = input('Yes');
  readonly noLabel = input('No');
  readonly errorPrefix = input('Error:');

  protected readonly id = nextId('ret-yes-no');
  protected readonly value = signal<boolean | null>(null);
  protected readonly disabled = signal(false);
  protected readonly options = computed(() => [
    { value: true, label: this.yesLabel() },
    { value: false, label: this.noLabel() },
  ]);
  protected readonly describedBy = computed(() => describedBy(this.id, this.hint(), this.error()));

  private onChange: (value: boolean) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: boolean | null): void {
    this.value.set(value);
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }

  protected leave(event: FocusEvent) {
    const group = event.currentTarget as HTMLElement;
    if (!group.contains(event.relatedTarget as Node | null)) this.onTouched();
  }

  protected select(value: boolean) {
    this.value.set(value);
    this.onChange(value);
  }
}
