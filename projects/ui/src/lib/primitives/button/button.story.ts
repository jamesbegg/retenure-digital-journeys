import { KeyValuePipe } from '@angular/common';
import { Component } from '@angular/core';
import { Variants } from '../../interfaces/story';
import { iconNames } from '../icon/icon.story';
import { Button } from './button';

@Component({
  selector: 'ret-button-story',
  imports: [Button, KeyValuePipe],
  templateUrl: './button.story.html',
  styleUrl: './button.story.scss',
})
export class ButtonStory {
  protected readonly variants: Variants<Button> = {
    variant: {
      primary: 'The one main action on a screen',
      secondary: 'Lower-emphasis alternative next to the primary',
      ghost: 'Text-weight action inside cards, such as Edit',
      danger: 'Destructive action, studio only',
      link: 'Looks like a link, behaves as a button',
    },
    size: { md: 'Medium, studio', lg: 'Large, client default (44 px minimum)' },
    icon: iconNames,
    iconPosition: {
      leading: 'Icon before the label',
      trailing: 'Icon after the label',
      only: 'Icon only, named by its label',
    },
    type: { button: 'Button (default)', submit: 'Submits its form' },
    disabled: 'Disabled',
    pending: 'Pending: spinner, announced, blocks double submit',
  };
}
