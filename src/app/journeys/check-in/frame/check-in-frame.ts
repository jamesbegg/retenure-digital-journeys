import { DOCUMENT } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import {
  AdviserContact,
  Button,
  ClientHeader,
  JourneyShell,
  Modal,
  ShellState,
} from '@retenure/ui';
import { JourneyService } from '../../../journey/journey.service';
import { TenantService } from '../../../tenant/tenant.service';
import { appCopy } from '../check-in-copy';
import { fill } from '../fill';
import { initials } from '../initials';
import { CheckInProgress } from '../../../interfaces/check-in';

// What every check-in page shares: the header, the adviser contact, the urgent help sheet and the
// idle warning. A page gives it the heading, the content and the primary action.
@Component({
  selector: 'ret-check-in-frame',
  imports: [AdviserContact, Button, ClientHeader, JourneyShell, Modal],
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
  private readonly document = inject(DOCUMENT);
  private readonly theme = inject(TenantService).theme;

  protected readonly urgentOpen = signal(false);
  protected readonly firmName = computed(() => this.theme()?.displayName);
  protected readonly firmMark = computed(() => initials(this.firmName() ?? ''));
  protected readonly copy = computed(() => this.journey.journey()?.journey.copy ?? null);
  protected readonly labels = computed(() => this.copy() ?? appCopy.fallback);
  protected readonly adviser = computed(() => (this.withContact() ? this.journey.adviser() : null));
  protected readonly urgentLabel = computed(() =>
    this.adviser() ? this.copy()?.urgentLink : undefined,
  );
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
  protected readonly urgent = computed(() => {
    const adviser = this.adviser();
    if (!adviser) return null;
    const values = { adviser: adviser.name, phone: adviser.phone ?? '' };
    const { heading, body, call, emergency } = appCopy.urgent;
    return {
      heading: fill(heading, values),
      body,
      emergency,
      primary: adviser.phone ? fill(call, values) : fill(this.labels().emailAdviser, values),
      href: adviser.phone ? `tel:${adviser.phone.replace(/\s/g, '')}` : `mailto:${adviser.email}`,
    };
  });

  protected call(href: string) {
    this.document.location.href = href;
  }

  protected idleChanged(open: boolean) {
    if (!open && this.journey.idleWarning()) void this.journey.renew();
  }
}
