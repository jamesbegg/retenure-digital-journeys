import { KeyValuePipe } from '@angular/common';
import { Component } from '@angular/core';
import { Variants } from '../../interfaces/story';
import { Icon } from './icon';

@Component({
  selector: 'ret-icon-story',
  imports: [Icon, KeyValuePipe],
  templateUrl: './icon.story.html',
  styleUrl: './icon.story.scss',
})
export class IconStory {
  protected readonly variants: Variants<Icon> = {
    name: {
      'arrow-left': 'Back',
      'arrow-right': 'Continue',
      check: 'Selected option',
      'circle-alert': 'Field error',
      'circle-check': 'Saved or answered',
      info: 'Information notice',
      'loader-circle': 'Pending button',
      mail: 'Email the adviser',
      pencil: 'Edit an answer',
      'triangle-alert': 'Warning notice',
      x: 'Close or remove',
    },
    size: { sm: 'Small, 1em', md: 'Medium, 1.25em (default)', lg: 'Large, 1.5em' },
    tone: {
      current: 'Current text colour (default)',
      info: 'Info',
      success: 'Success',
      warning: 'Warning',
      danger: 'Danger',
    },
  };
}
