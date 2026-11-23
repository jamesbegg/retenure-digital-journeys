import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
} from '@angular/core';
import { ControlValueAccessor, FormControl, ReactiveFormsModule } from '@angular/forms';
import { FactCardValue } from '../../interfaces/answer';
import { FactCardField, FactCardVariant } from '../../interfaces/fact-card';
import { HeldFact } from '../../interfaces/question';
import { Badge } from '../../primitives/badge/badge';
import { Button } from '../../primitives/button/button';
import { FieldMessages } from '../../primitives/field-messages/field-messages';
import { TextField } from '../../primitives/text-field/text-field';
import { provideValueAccessor } from '../../utils/forms';
import { nextId } from '../../utils/id';

@Component({
  selector: 'ret-fact-card',
  imports: [Badge, Button, FieldMessages, TextField, ReactiveFormsModule],
  templateUrl: './fact-card.html',
  styleUrl: './fact-card.scss',
  providers: [provideValueAccessor(() => FactCard)],
  host: { '[attr.data-variant]': 'variant()' },
})
export class FactCard implements ControlValueAccessor {
  readonly heading = input.required<string>();
  readonly facts = input.required<HeldFact[]>();
  readonly variant = input<FactCardVariant>('question');
  readonly confirm = input.required<string>();
  readonly makeChange = input.required<string>();
  readonly confirmed = input.required<string>();
  readonly cancel = input.required<string>();
  readonly save = input.required<string>();
  readonly factNote = input.required<string>();
  readonly requiredMessage = input.required<string>();
  readonly error = input<string>();
  readonly errorPrefix = input('Error:');
  readonly changeRequested = output<void>();

  protected readonly headingId = nextId('ret-fact-card-heading');
  protected readonly value = signal<FactCardValue>(null);
  protected readonly changing = signal(false);
  protected readonly attempted = signal(false);
  protected readonly disabled = signal(false);
  protected readonly fields = signal<FactCardField[]>([]);
  protected readonly note = new FormControl('', { nonNullable: true });
  protected readonly rows = computed(() => {
    const changed = new Map(this.value()?.changed.map((c) => [c.factId, c.newValue]));
    return this.facts().map((fact) => ({ ...fact, value: changed.get(fact.id) ?? fact.value }));
  });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private onChange: (value: FactCardValue) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: FactCardValue): void {
    this.value.set(value);
    this.changing.set(false);
  }

  registerOnChange(fn: (value: FactCardValue) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
    const edits = [...this.fields().map(({ control }) => control), this.note];
    edits.forEach((control) => (disabled ? control.disable() : control.enable()));
  }

  protected blank(control: FormControl<string>) {
    return this.attempted() && !control.value.trim();
  }

  protected confirmAll() {
    this.commit({ changed: [] });
  }

  protected startChange() {
    const rows = this.rows();
    this.fields.set(
      this.facts().map((fact, i) => ({
        fact,
        control: new FormControl(rows[i].value, { nonNullable: true }),
      })),
    );
    this.note.setValue(this.value()?.note ?? '');
    this.attempted.set(false);
    this.changing.set(true);
    // A card being edited is not answered until it is saved.
    if (this.value()) this.onChange(null);
    this.focus('input, textarea');
  }

  protected cancelChange() {
    this.changing.set(false);
    this.onChange(this.value());
    this.focus('.heading');
  }

  protected saveChange() {
    this.attempted.set(true);
    const fields = this.fields();
    if (fields.some(({ control }) => !control.value.trim())) {
      this.focus('[aria-invalid="true"]');
      return;
    }
    const changed = fields
      .map(({ fact, control }) => ({ fact, newValue: control.value.trim() }))
      .filter(({ fact, newValue }) => newValue !== fact.value.trim())
      .map(({ fact, newValue }) => ({ factId: fact.id, newValue }));
    const note = this.note.value.trim();
    this.commit(note ? { changed, note } : { changed });
  }

  private commit(value: FactCardValue) {
    this.value.set(value);
    this.changing.set(false);
    this.onChange(value);
    this.onTouched();
    this.focus('.heading');
  }

  private focus(selector: string) {
    afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus(), {
      injector: this.injector,
    });
  }
}
