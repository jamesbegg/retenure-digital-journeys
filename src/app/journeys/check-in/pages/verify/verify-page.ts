import { Component, inject, signal } from '@angular/core';
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
  styleUrl: './verify-page.scss',
})
export class VerifyPage {
  protected readonly journey = inject(JourneyService);
  protected readonly copy = appCopy.verify;
  protected readonly form = new FormGroup({
    dateOfBirth: new FormControl('', { nonNullable: true }),
  });
  protected readonly error = signal<string | undefined>(undefined);

  constructor() {
    this.form.controls.dateOfBirth.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.error.set(undefined));
  }

  protected submit() {
    const { value, errors } = this.form.controls.dateOfBirth;
    const message = errors?.['incompleteDate']
      ? this.copy.incompleteDate
      : errors?.['invalidDate']
        ? this.copy.invalidDate
        : value
          ? undefined
          : this.copy.emptyDate;
    this.error.set(message);
    if (!message) void this.journey.verify(value);
  }
}
