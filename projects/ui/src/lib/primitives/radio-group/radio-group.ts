import { Component, computed, input, signal } from '@angular/core';
import { ControlValueAccessor, FormControl, ReactiveFormsModule } from '@angular/forms';
import { RadioGroupSize, RadioGroupValue, RadioOption } from '../../interfaces/radio-group';
import { describedBy } from '../../utils/described-by';
import { provideValueAccessor } from '../../utils/forms';
import { nextId } from '../../utils/id';
import { FieldMessages } from '../field-messages/field-messages';
import { Icon } from '../icon/icon';
import { TextField } from '../text-field/text-field';

@Component({
  selector: 'ret-radio-group',
  imports: [FieldMessages, Icon, TextField, ReactiveFormsModule],
  templateUrl: './radio-group.html',
  styleUrl: './radio-group.scss',
  providers: [provideValueAccessor(() => RadioGroup)],
})
export class RadioGroup implements ControlValueAccessor {
  readonly label = input.required<string>();
  readonly options = input.required<RadioOption[]>();
  readonly hint = input<string>();
  readonly error = input<string>();
  readonly optionErrors = input<Record<string, string>>({});
  readonly size = input<RadioGroupSize>('lg');
  readonly errorPrefix = input('Error:');

  protected readonly id = nextId('ret-radio-group');
  protected readonly selected = signal<string | null>(null);
  protected readonly disabled = signal(false);
  protected readonly detail = new FormControl('', { nonNullable: true });
  private readonly drafts = new Map<string, string>();
  protected readonly describedBy = computed(() => describedBy(this.id, this.hint(), this.error()));

  private onChange: (value: RadioGroupValue) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor() {
    this.detail.valueChanges.subscribe((input) => {
      const selected = this.selected();
      if (selected !== null) this.drafts.set(selected, input);
      this.emit();
    });
  }

  writeValue(value: RadioGroupValue | null): void {
    this.drafts.clear();
    if (value?.input) this.drafts.set(value.value, value.input);
    this.selected.set(value?.value ?? null);
    this.detail.setValue(value?.input ?? '', { emitEvent: false });
  }

  registerOnChange(fn: (value: RadioGroupValue) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }

  protected select(value: string) {
    this.selected.set(value);
    this.detail.setValue(this.drafts.get(value) ?? '', { emitEvent: false });
    this.emit();
  }

  protected leave(event: FocusEvent) {
    const group = event.currentTarget as HTMLElement;
    if (!group.contains(event.relatedTarget as Node | null)) this.onTouched();
  }

  protected describeOption(option: RadioOption, index: number) {
    const ids = [
      option.hint && `${this.optionId(index)}-hint`,
      option.input && this.selected() === option.value && `${this.optionId(index)}-reveal`,
    ];
    return ids.filter(Boolean).join(' ') || null;
  }

  protected optionError(value: string) {
    const errors = this.optionErrors();
    return Object.hasOwn(errors, value) ? errors[value] : undefined;
  }

  protected optionId(index: number) {
    return `${this.id}-${index}`;
  }

  private emit() {
    const value = this.selected();
    if (value === null) return;
    const option = this.options().find((o) => o.value === value);
    this.onChange(option?.input ? { value, input: this.detail.value } : { value });
  }
}
