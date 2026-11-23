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
  untracked,
  viewChildren,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { SectionAnswers } from '../../interfaces/answer';
import { JourneyCopy } from '../../interfaces/journey-copy';
import { Section } from '../../interfaces/question';
import { QuestionItem, ShownQuestions } from '../../interfaces/question-renderer';
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

  private readonly items = computed(() =>
    this.section().blocks.flatMap<QuestionItem>((block) =>
      block.type === 'card' && isRendered(block.question)
        ? [buildItem(block.question, untracked(this.answers)[block.question.id])]
        : [],
    ),
  );
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
  }

  private changed() {
    const items = this.items();
    this.version.update((version) => version + 1);
    this.reached.update((reached) => Math.max(reached, openCount(items)));
    this.answers.set(
      Object.fromEntries(
        items.flatMap((item) => {
          const answer = toAnswer(item);
          return answer ? [[item.question.id, answer]] : [];
        }),
      ),
    );
  }
}
