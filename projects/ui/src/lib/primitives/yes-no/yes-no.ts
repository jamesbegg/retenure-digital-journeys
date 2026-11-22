import { Component, computed, input, signal } from '@angular/core';
import { ControlValueAccessor, FormControl, ReactiveFormsModule } from '@angular/forms';
import { IconName } from '../../interfaces/icon';
import { YesNoDetailField, YesNoValue, YesNoVariant } from '../../interfaces/yes-no';
import { describedBy } from '../../utils/described-by';
import { provideValueAccessor } from '../../utils/forms';
import { nextId } from '../../utils/id';
import { FieldMessages } from '../field-messages/field-messages';
import { Icon } from '../icon/icon';
import { TextField } from '../text-field/text-field';

@Component({
  selector: 'ret-yes-no',
  imports: [FieldMessages, Icon, TextField, ReactiveFormsModule],
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
  readonly detail = input<YesNoDetailField>();
  readonly detailError = input<string>();

  protected readonly id = nextId('ret-yes-no');
  protected readonly value = signal<boolean | null>(null);
  protected readonly disabled = signal(false);
  protected readonly options = computed(() => [
    { value: true, label: this.yesLabel() },
    { value: false, label: this.noLabel() },
  ]);
  protected readonly describedBy = computed(() => describedBy(this.id, this.hint(), this.error()));
  protected readonly detailText = new FormControl('', { nonNullable: true });
  protected readonly revealId = `${this.id}-reveal`;
  protected readonly detailShown = computed(() => {
    const detail = this.detail();
    return !!detail && this.value() === detail.when;
  });

  private onChange: (value: YesNoValue) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor() {
    this.detailText.valueChanges.subscribe(() => this.emit());
  }

  writeValue(value: YesNoValue | null): void {
    this.value.set(value?.value ?? null);
    const own = value !== null && value.value === this.detail()?.when;
    this.detailText.setValue(own ? (value.detail ?? '') : '', { emitEvent: false });
  }

  registerOnChange(fn: (value: YesNoValue) => void): void {
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
    this.emit();
  }

  private emit() {
    const value = this.value();
    if (value === null) return;
    const detail = this.detailShown() ? this.detailText.value : '';
    this.onChange(detail ? { value, detail } : { value });
  }
}
