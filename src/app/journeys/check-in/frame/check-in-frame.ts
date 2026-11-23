import { Component, computed, inject, input, output } from '@angular/core';
import { AdviserContact, ClientHeader, JourneyShell, Modal, ShellState } from '@retenure/ui';
import { JourneyService } from '../../../journey/journey.service';
import { TenantService } from '../../../tenant/tenant.service';
import { appCopy } from '../check-in-copy';
import { fill } from '../fill';
import { initials } from '../initials';
import { CheckInProgress } from '../../../interfaces/check-in';

// What every check-in page shares: the header, the adviser contact and the idle warning. A page gives it the heading, the content and the primary action.
@Component({
  selector: 'ret-check-in-frame',
  imports: [AdviserContact, ClientHeader, JourneyShell, Modal],
  templateUrl: './check-in-frame.html',
})
export class CheckInFrame {
  readonly heading = input.required<string>();
  readonly state = input<ShellState>('ready');
  readonly progress = input<CheckInProgress>();
  readonly backable = input(false);
  readonly withContact = input(false);
  readonly back = output<void>();

  protected readonly journey = inject(JourneyService);
  private readonly theme = inject(TenantService).theme;

  protected readonly firmName = computed(() => this.theme()?.displayName);
  protected readonly firmMark = computed(() => initials(this.firmName() ?? ''));
  protected readonly copy = computed(() => this.journey.journey()?.journey.copy ?? null);
  protected readonly labels = computed(() => this.copy() ?? appCopy.fallback);
  protected readonly adviser = computed(() => (this.withContact() ? this.journey.adviser() : null));
  protected readonly initials = initials;
  protected readonly emailLabel = computed(() =>
    fill(this.labels().emailAdviser, { adviser: this.adviser()?.name ?? '' }),
  );
  protected readonly headerProgress = computed(() => {
    const progress = this.progress();
    const copy = this.copy();
    if (!progress || !copy) return undefined;
    const valueText = fill(copy.progressValue, { step: progress.step, total: progress.total });
    return { ...progress, meta: valueText, valueText };
  });
  // The press itself counts as activity and may already have renewed the session.
  protected moreTime() {
    if (this.journey.idleWarning()) void this.journey.renew();
  }

  protected idleChanged(open: boolean) {
    if (!open && this.journey.idleWarning()) void this.journey.renew();
  }
}
