import { KeyValuePipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Variants } from '../../interfaces/story';
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

  protected readonly yes = new FormControl<boolean | null>(true);
  protected readonly disabled = new FormControl<boolean | null>({ value: false, disabled: true });
}
