import { DOCUMENT } from '@angular/common';
import { afterNextRender, Component, inject, Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Button, Notice, TextField } from '@retenure/ui';
import { JourneyService } from '../../../../journey/journey.service';
import { appCopy } from '../../check-in-copy';
import { CheckInFrame } from '../../frame/check-in-frame';

@Component({
  selector: 'ret-verify-page',
  imports: [Button, CheckInFrame, Notice, ReactiveFormsModule, TextField],
  templateUrl: './verify-page.html',
})
export class VerifyPage {
  protected readonly journey = inject(JourneyService);
  protected readonly copy = appCopy.verify;
  protected readonly form = new FormGroup({
    dateOfBirth: new FormControl('', { nonNullable: true }),
  });
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  protected readonly error = signal<string | undefined>(undefined);

  constructor() {
    this.form.controls.dateOfBirth.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.error.set(undefined));
  }

  protected async submit() {
    const { value, errors } = this.form.controls.dateOfBirth;
    const message = errors?.['incompleteDate']
      ? this.copy.incompleteDate
      : errors?.['invalidDate']
        ? this.copy.invalidDate
        : value
          ? undefined
          : this.copy.emptyDate;
    this.error.set(message);
    if (message) return;
    await this.journey.verify(value);
    // A failed check leaves the client on this page, so say so: the notice, or else the heading.
    if (this.journey.stage() === 'verify') {
      afterNextRender(
        () =>
          (
            this.document.querySelector<HTMLElement>('ret-notice') ??
            this.document.querySelector<HTMLElement>('h1')
          )?.focus(),
        { injector: this.injector },
      );
    }
  }
}
