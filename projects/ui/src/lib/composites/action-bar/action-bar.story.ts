import { Component } from '@angular/core';
import { ActionBarActions } from '../../interfaces/action-bar';
import { Variants } from '../../interfaces/story';
import { ActionBar } from './action-bar';

@Component({
  selector: 'ret-action-bar-story',
  imports: [ActionBar],
  templateUrl: './action-bar.story.html',
  styleUrl: './action-bar.story.scss',
})
export class ActionBarStory {
  protected readonly variants: Variants<ActionBar> = {
    actions: {
      single: 'Single: one primary action',
      pair: 'Pair: secondary on the left, primary on the right',
      edit: 'Edit: Cancel and Save',
    },
    pending: 'Pending: primary shows progress, others disabled',
    hidden: 'Hidden until the screen is complete',
  };

  protected readonly examples: ActionBarActions[] = [
    { kind: 'single', primary: 'Continue' },
    { kind: 'pair', secondary: 'Back', primary: 'Confirm' },
    { kind: 'edit', cancel: 'Cancel', save: 'Save' },
    { kind: 'single', primary: 'Continue', link: 'Nothing to add' },
    { kind: 'pair', secondary: 'Back', primary: 'Continue', link: 'Save and finish later' },
  ];
}
