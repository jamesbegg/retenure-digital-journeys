import { Component, computed, inject, input } from '@angular/core';
import { Card } from '@retenure/ui';
import { JourneyService } from '../../../../journey/journey.service';
import { appCopy } from '../../check-in-copy';
import { CheckInFrame } from '../../frame/check-in-frame';
import { fill } from '../../fill';
import { StatusStage } from '../../../../interfaces/check-in';

const date = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long' });

// One page for every stage that only tells the client what happened. The route says which.
@Component({
  selector: 'ret-status-page',
  imports: [Card, CheckInFrame],
  templateUrl: './status-page.html',
})
export class StatusPage {
  readonly stage = input.required<StatusStage>();

  private readonly journey = inject(JourneyService);

  // Only these two have an adviser to name. The others say "your adviser".
  protected readonly withContact = computed(
    () => this.stage() === 'expired' || this.stage() === 'already-completed',
  );
  protected readonly status = computed(() => {
    const { heading, paragraphs, aside } = appCopy.statuses[this.stage()];
    const sent = this.journey.submittedAt();
    const values = {
      adviser: this.journey.adviser()?.name ?? '',
      date: sent ? date.format(new Date(sent)) : '',
    };
    return {
      heading,
      paragraphs: paragraphs.map((text) => fill(text, values)),
      aside: aside && { heading: aside.heading, body: fill(aside.body, values) },
    };
  });
}
