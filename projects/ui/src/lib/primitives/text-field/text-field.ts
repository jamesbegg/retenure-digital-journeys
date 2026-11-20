import { Component, computed, input, signal } from '@angular/core';
import { ControlValueAccessor, ValidationErrors, Validator } from '@angular/forms';
import {
  DatePart,
  DateParts,
  IncompleteDateError,
  InvalidDateError,
  TextFieldSize,
  TextFieldType,
} from '../../interfaces/text-field';
import { nextId } from '../../utils/id';
import { provideValidator, provideValueAccessor } from '../../utils/forms';
import { describedBy } from '../../utils/described-by';
import { FieldMessages } from '../field-messages/field-messages';

const DATE_PARTS: DatePart[] = ['day', 'month', 'year'];
const EMPTY_DATE: DateParts = { day: '', month: '', year: '' };
const pounds = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 });
const pence = new Intl.NumberFormat('en-GB', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

@Component({
  selector: 'ret-text-field',
  imports: [FieldMessages],
  templateUrl: './text-field.html',
  styleUrl: './text-field.scss',
  providers: [provideValueAccessor(() => TextField), provideValidator(() => TextField)],
})
export class TextField implements ControlValueAccessor, Validator {
  readonly label = input.required<string>();
  readonly hint = input<string>();
  readonly error = input<string>();
  readonly type = input<TextFieldType>('text');
  readonly size = input<TextFieldSize>('lg');
  readonly autocomplete = input<string>();
  readonly readonly = input(false);
  readonly dateLabels = input<DateParts>({ day: 'Day', month: 'Month', year: 'Year' });
  readonly errorPrefix = input('Error:');

  protected readonly id = nextId('ret-text-field');
  protected readonly prefixId = `${this.id}-prefix`;
  protected readonly parts = DATE_PARTS;
  protected readonly text = signal('');
  protected readonly date = signal<DateParts>(EMPTY_DATE);
  protected readonly disabled = signal(false);

  protected readonly describedBy = computed(() =>
    describedBy(
      this.id,
      this.hint(),
      this.error(),
      ...(this.type() === 'money' ? [this.prefixId] : []),
    ),
  );
  protected readonly invalidParts = computed((): DatePart[] => {
    if (!this.error()) return [];
    const missing = DATE_PARTS.filter((part) => !this.date()[part]);
    return missing.length && missing.length < DATE_PARTS.length ? missing : DATE_PARTS;
  });
  protected readonly htmlType = computed(() => {
    const type = this.type();
    return type === 'email' || type === 'tel' ? type : 'text';
  });

  private onChange: (value: string) => void = () => undefined;
  protected onTouched: () => void = () => undefined;

  writeValue(value: string | null): void {
    const text = value ?? '';
    if (this.type() === 'date') {
      const [year = '', month = '', day = ''] = text ? text.split('-') : [];
      this.date.set({ day, month, year });
    } else {
      this.text.set(this.type() === 'money' ? formatMoney(text) : text);
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }

  validate(): ValidationErrors | null {
    if (this.type() !== 'date') return null;
    const date = this.date();
    const missing = DATE_PARTS.filter((part) => !date[part]);
    if (missing.length === DATE_PARTS.length) return null;
    if (missing.length) return { incompleteDate: { missing } } satisfies IncompleteDateError;
    return isoDate(date) ? null : ({ invalidDate: true } satisfies InvalidDateError);
  }

  protected inputText(value: string) {
    this.text.set(value);
    this.onChange(this.type() === 'money' ? moneyValue(value) : value);
  }

  protected blurText() {
    if (this.type() === 'money') {
      const typed = moneyValue(this.text());
      const formatted = formatMoney(this.text());
      this.text.set(formatted);
      if (moneyValue(formatted) !== typed) this.onChange(moneyValue(formatted));
    }
    this.onTouched();
  }

  protected inputDate(part: DatePart, value: string) {
    const date = { ...this.date(), [part]: value.trim() };
    this.date.set(date);
    this.onChange(isoDate(date) ?? '');
  }

  protected pasteDate(event: ClipboardEvent) {
    const date = fullDate(event.clipboardData?.getData('text') ?? '');
    if (!date || this.readonly()) return;
    event.preventDefault();
    this.date.set(date);
    this.onChange(isoDate(date) ?? '');
  }
}

// A whole date pasted into any part: 14/03/1996, 14-3-1996, 14.03.1996, 14 03 1996 or 1996-03-14.
function fullDate(text: string): DateParts | null {
  const value = text.trim();
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value);
  const uk = /^(\d{1,2})[/.\s-](\d{1,2})[/.\s-](\d{4})$/.exec(value);
  const [year, month, day] = iso ? [iso[1], iso[2], iso[3]] : uk ? [uk[3], uk[2], uk[1]] : [];
  return year && month && day
    ? { day: day.padStart(2, '0'), month: month.padStart(2, '0'), year }
    : null;
}

function isoDate({ day, month, year }: DateParts): string | null {
  if (!/^\d{4}$/.test(year) || !/^\d{1,2}$/.test(month) || !/^\d{1,2}$/.test(day)) return null;
  const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  const parsed = new Date(`${iso}T00:00:00Z`);
  return !isNaN(parsed.getTime()) && parsed.toISOString().startsWith(iso) ? iso : null;
}

function moneyValue(display: string): string {
  const digits = display.replace(/[£,\s]/g, '');
  return /^\d*\.?\d*$/.test(digits) ? digits : display;
}

function formatMoney(value: string): string {
  const digits = moneyValue(value);
  if (!digits || !/^\d+(\.\d+)?$/.test(digits)) return value;
  return (digits.includes('.') ? pence : pounds).format(Number(digits));
}
