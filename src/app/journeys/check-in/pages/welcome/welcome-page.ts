import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Button, Steps } from '@retenure/ui';
import { JourneyService } from '../../../../journey/journey.service';
import { sectionPath } from '../../check-in-navigation';
import { CheckInFrame } from '../../frame/check-in-frame';

@Component({
  selector: 'ret-welcome-page',
  imports: [Button, CheckInFrame, Steps],
  templateUrl: './welcome-page.html',
})
export class WelcomePage {
  private readonly router = inject(Router);
  private readonly journey = inject(JourneyService).journey;

  protected readonly heading = computed(() => this.journey()?.journey.title ?? '');
  protected readonly continueLabel = computed(() => this.journey()?.journey.copy.continue ?? '');
  protected readonly steps = computed(() =>
    (this.journey()?.sections ?? []).map(({ title }) => ({ label: title, state: 'todo' as const })),
  );

  protected start() {
    const first = this.journey()?.sections[0];
    if (first) void this.router.navigateByUrl(sectionPath(first.id));
  }
}
