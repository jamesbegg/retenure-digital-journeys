import { KeyValuePipe } from '@angular/common';
import { Component } from '@angular/core';
import { Variants } from '../../interfaces/story';
import { ProgressBar } from './progress-bar';

@Component({
  selector: 'ret-progress-bar-story',
  imports: [ProgressBar, KeyValuePipe],
  templateUrl: './progress-bar.story.html',
})
export class ProgressBarStory {
  protected readonly variants: Variants<ProgressBar> = {
    variant: {
      segmented: 'One segment per step (default)',
      continuous: 'One bar filled to the share completed',
    },
  };
}
