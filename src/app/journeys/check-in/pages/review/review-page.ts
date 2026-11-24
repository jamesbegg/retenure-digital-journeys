import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Button, FactCard, Notice } from '@retenure/ui';
import { JourneyService } from '../../../../journey/journey.service';
import { appCopy } from '../../check-in-copy';
import { sectionPath } from '../../check-in-navigation';
import { fill } from '../../fill';
import { CheckInFrame } from '../../frame/check-in-frame';
import { summariseAnswers } from '../../summarise-answers';

@Component({
  selector: 'ret-review-page',
  imports: [Button, CheckInFrame, FactCard, Notice],
  templateUrl: './review-page.html',
})
export class ReviewPage {
  private readonly router = inject(Router);

  protected readonly journey = inject(JourneyService);
  protected readonly copy = appCopy;
  protected readonly open = this.journey.journey;
  protected readonly cards = computed(() => {
    const journey = this.open();
    if (!journey) return [];
    return journey.sections.map((section) => ({
      id: section.id,
      title: section.title,
      facts: summariseAnswers(
        section,
        this.journey.answers()[section.id] ?? {},
        journey.journey.copy,
      ),
    }));
  });
  // The send did not go through, so the answers stay as they are while the client tries again.
  protected readonly failed = computed(
    () =>
      (this.journey.answersLocked() && !this.journey.busy()) ||
      (this.journey.submitProblem() === 'invalid' && !this.journey.invalidSection()),
  );
  protected readonly changeable = computed(() => !this.failed() && !this.journey.answersLocked());
  protected readonly progress = computed(() => {
    const total = (this.open()?.sections.length ?? 0) + 1;
    return { label: this.open()?.journey.copy.checkAnswersTitle ?? '', step: total, total };
  });
  protected readonly sendLabel = computed(() =>
    fill(this.open()?.journey.copy.sendTo ?? '', { adviser: this.open()?.adviser.name ?? '' }),
  );

  protected async send() {
    await this.journey.submit();
    // The backend refused some answers: go to the first section it names, which shows its message.
    const section = this.journey.invalidSection();
    if (this.journey.submitProblem() === 'invalid' && section) await this.change(section);
  }

  protected change(sectionId: string) {
    return this.router.navigateByUrl(sectionPath(sectionId));
  }

  protected back() {
    const sections = this.open()?.sections ?? [];
    const last = sections[sections.length - 1];
    return last ? this.change(last.id) : undefined;
  }
}
