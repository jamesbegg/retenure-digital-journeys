import { Component, computed, inject } from '@angular/core';
import { Icon } from '@retenure/ui';
import { JourneyService } from '../../../../journey/journey.service';
import { appCopy } from '../../check-in-copy';
import { fill } from '../../fill';
import { CheckInFrame } from '../../frame/check-in-frame';

@Component({
  selector: 'ret-done-page',
  imports: [CheckInFrame, Icon],
  templateUrl: './done-page.html',
})
export class DonePage {
  private readonly journey = inject(JourneyService);

  private readonly copy = computed(() => this.journey.journey()?.journey.copy);
  // A lost response leaves no name, so the title is the neutral one.
  protected readonly heading = computed(() => {
    const name = this.journey.doneName();
    const doneTitle = this.copy()?.doneTitle;
    return name && doneTitle ? fill(doneTitle, { name }) : appCopy.doneNeutralTitle;
  });
  protected readonly body = computed(() => {
    const doneBody = this.copy()?.doneBody;
    const adviser = this.journey.adviser();
    return doneBody && adviser ? fill(doneBody, { adviser: adviser.name }) : null;
  });
}
