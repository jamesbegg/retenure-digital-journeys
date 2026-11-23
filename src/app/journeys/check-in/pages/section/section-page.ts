import { Component, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Button, Notice, QuestionRenderer, SectionAnswers } from '@retenure/ui';
import { JourneyService } from '../../../../journey/journey.service';
import { reviewPath, sectionPath, welcomePath } from '../../check-in-navigation';
import { CheckInFrame } from '../../frame/check-in-frame';

@Component({
  selector: 'ret-section-page',
  imports: [Button, CheckInFrame, Notice, QuestionRenderer],
  templateUrl: './section-page.html',
})
export class SectionPage {
  readonly sectionId = input.required<string>();

  private readonly router = inject(Router);
  private readonly journey = inject(JourneyService);
  private readonly renderer = viewChild(QuestionRenderer);

  protected readonly complete = signal(false);
  protected readonly open = this.journey.journey;
  protected readonly index = computed(
    () => this.open()?.sections.findIndex(({ id }) => id === this.sectionId()) ?? -1,
  );
  protected readonly section = computed(() => this.open()?.sections[this.index()]);
  protected readonly answers = computed(() => this.journey.answers()[this.sectionId()] ?? {});
  protected readonly progress = computed(() => ({
    label: this.section()?.title ?? '',
    step: this.index() + 1,
    total: (this.open()?.sections.length ?? 0) + 1,
  }));
  // The messages the backend sent back for questions on this section, after a refused send.
  protected readonly problems = computed(() => {
    const errors = this.journey.fieldErrors();
    return (this.section()?.blocks ?? []).flatMap(({ question }) =>
      errors[question.id] ? [errors[question.id]] : [],
    );
  });

  constructor() {
    // An address for a section that is not in this journey starts at the first one.
    effect(() => {
      const sections = this.open()?.sections;
      if (sections?.length && this.index() < 0) {
        void this.router.navigateByUrl(sectionPath(sections[0].id), { replaceUrl: true });
      }
    });
  }

  protected save(answers: SectionAnswers) {
    this.journey.setAnswers(this.sectionId(), answers);
  }

  protected next() {
    if (!this.complete()) return this.renderer()?.showErrors();
    const sections = this.open()?.sections ?? [];
    const next = sections[this.index() + 1];
    return this.router.navigateByUrl(next ? sectionPath(next.id) : reviewPath);
  }

  protected back() {
    const previous = this.open()?.sections[this.index() - 1];
    return this.router.navigateByUrl(previous ? sectionPath(previous.id) : welcomePath);
  }
}
