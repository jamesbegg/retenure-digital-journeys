import {
  afterRenderEffect,
  Component,
  computed,
  effect,
  ElementRef,
  input,
  linkedSignal,
  model,
  output,
  signal,
  viewChildren,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { SectionAnswers } from '../../interfaces/answer';
import { JourneyCopy } from '../../interfaces/journey-copy';
import { Section } from '../../interfaces/question';
import { QuestionItem, RendererSource, ShownQuestions } from '../../interfaces/question-renderer';
import { RadioGroup } from '../../primitives/radio-group/radio-group';
import { TextField } from '../../primitives/text-field/text-field';
import { YesNo } from '../../primitives/yes-no/yes-no';
import {
  buildItem,
  isAnswered,
  isRendered,
  questionError,
  toAnswer,
} from '../../utils/question-controls';
import { Card } from '../card/card';
import { FactCard } from '../fact-card/fact-card';

// Index after the first unanswered question, or the count when every question is answered.
const openCount = (items: QuestionItem[]) => {
  const open = items.findIndex((item) => !isAnswered(item));
  return open < 0 ? items.length : open + 1;
};

@Component({
  selector: 'ret-question-renderer',
  imports: [Card, FactCard, RadioGroup, TextField, YesNo, ReactiveFormsModule],
  templateUrl: './question-renderer.html',
  styleUrl: './question-renderer.scss',
})
export class QuestionRenderer {
  readonly section = input.required<Section>();
  readonly copy = input.required<JourneyCopy>();
  readonly answers = model<SectionAnswers>({});
  readonly complete = output<boolean>();

  // The controls are rebuilt when the section changes, or when the parent writes answers the
  // renderer did not emit itself (after re-verifying, for example).
  private emitted: string | undefined;
  private readonly items = linkedSignal<RendererSource, QuestionItem[]>({
    source: () => ({ section: this.section(), answers: this.answers() }),
    computation: ({ section, answers }, previous) => {
      const json = JSON.stringify(answers);
      if (previous && previous.source.section === section && json === this.emitted) {
        return previous.value;
      }
      this.emitted = json;
      return section.blocks.flatMap<QuestionItem>((block) =>
        block.type === 'card' && isRendered(block.question)
          ? [buildItem(block.question, answers[block.question.id])]
          : [],
      );
    },
  });
  // Bumped on every change, because a FormControl's state is not a signal.
  private readonly version = signal(0);
  private readonly reached = linkedSignal(() => openCount(this.items()));
  private readonly cards = viewChildren<ElementRef<HTMLElement>>('card');

  protected readonly visible = computed(() => this.items().slice(0, this.reached()));
  protected readonly current = computed(() => {
    this.version();
    return this.items().findIndex((item) => !isAnswered(item));
  });
  protected readonly errors = computed(() => {
    this.version();
    return this.visible().map((item) =>
      item.control.touched ? questionError(item, this.copy()) : {},
    );
  });
  private readonly done = computed(() => {
    this.version();
    return this.items().every(isAnswered);
  });

  constructor() {
    effect((onCleanup) => {
      const subscriptions = this.items().map((item) =>
        item.control.events.subscribe(() => this.changed()),
      );
      onCleanup(() => subscriptions.forEach((subscription) => subscription.unsubscribe()));
    });
    effect(() => this.complete.emit(this.done()));

    let shown: ShownQuestions | undefined;
    afterRenderEffect(() => {
      const next = { items: this.items(), count: this.visible().length };
      const previous = shown;
      shown = next;
      if (previous?.items !== next.items || next.count <= previous.count) return;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.cards()
        .at(next.count - 1)
        ?.nativeElement.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
    });
  }

  /** Shows the error on every question on screen, for a Continue pressed too early. */
  showErrors() {
    this.visible().forEach((item) => item.control.markAsTouched());
    const first = this.visible().findIndex((item) => item.control.invalid);
    if (first < 0) return;
    const card = this.cards()[first]?.nativeElement;
    const optionError = questionError(this.visible()[first], this.copy()).optionErrors;
    (
      card?.querySelector<HTMLElement>('[aria-invalid="true"]') ??
      (optionError &&
        card?.querySelector<HTMLElement>('.option-input input, .option-input textarea')) ??
      card?.querySelector<HTMLElement>('.heading, input, textarea')
    )?.focus();
  }

  private changed() {
    const items = this.items();
    this.version.update((version) => version + 1);
    this.reached.update((reached) => Math.max(reached, openCount(items)));
    const answers = Object.fromEntries(
      items.flatMap((item) => {
        const answer = toAnswer(item);
        return answer ? [[item.question.id, answer]] : [];
      }),
    );
    this.emitted = JSON.stringify(answers);
    this.answers.set(answers);
  }
}
