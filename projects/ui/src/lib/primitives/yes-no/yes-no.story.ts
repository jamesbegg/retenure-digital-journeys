import { KeyValuePipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Variants } from '../../interfaces/story';
import { YesNoValue } from '../../interfaces/yes-no';
import { iconNames } from '../icon/icon.story';
import { YesNo } from './yes-no';

@Component({
  selector: 'ret-yes-no-story',
  imports: [YesNo, KeyValuePipe, ReactiveFormsModule],
  templateUrl: './yes-no.story.html',
})
export class YesNoStory {
  protected readonly variants: Variants<YesNo> = {
    variant: {
      standalone: 'Standalone: its own card',
      embedded: 'Embedded: no card, inside a parent Card',
    },
    icon: iconNames,
  };

  protected readonly yes = new FormControl<YesNoValue | null>({ value: true });
  protected readonly disabled = new FormControl<YesNoValue | null>({
    value: { value: false },
    disabled: true,
  });
  protected readonly withDetail = new FormControl<YesNoValue | null>({
    value: false,
    detail: 'An apprenticeship with a local engineering firm',
  });
  protected readonly detailError = new FormControl<YesNoValue | null>({ value: false });
}
