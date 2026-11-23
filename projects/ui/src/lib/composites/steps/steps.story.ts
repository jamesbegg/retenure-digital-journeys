import { Component } from '@angular/core';
import { StepItem } from '../../interfaces/steps';
import { Variants } from '../../interfaces/story';
import { Steps } from './steps';

@Component({
  selector: 'ret-steps-story',
  imports: [Steps],
  templateUrl: './steps.story.html',
})
export class StepsStory {
  // The three states are item values, not inputs, so there is no variant to list.
  protected readonly variants: Variants<Steps> = {};

  protected readonly items: StepItem[] = [
    { label: 'Check what we hold', meta: 'Quick confirmations, about 3 minutes', state: 'done' },
    {
      label: 'Anything that has changed',
      meta: 'Life events, a yes or no for each',
      state: 'current',
    },
    { label: 'A few questions from your adviser', state: 'todo' },
    { label: 'Anything else', meta: 'In your own words', state: 'todo' },
  ];
}
