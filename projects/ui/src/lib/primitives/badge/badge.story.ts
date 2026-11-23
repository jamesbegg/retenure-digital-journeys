import { KeyValuePipe } from '@angular/common';
import { Component } from '@angular/core';
import { Variants } from '../../interfaces/story';
import { iconNames } from '../icon/icon.story';
import { Badge } from './badge';

@Component({
  selector: 'ret-badge-story',
  imports: [Badge, KeyValuePipe],
  templateUrl: './badge.story.html',
})
export class BadgeStory {
  protected readonly variants: Variants<Badge> = {
    tone: {
      neutral: 'Neutral: a plain status',
      success: 'Success: done or confirmed',
      warning: 'Warning: needs attention',
      danger: 'Danger: a problem',
      info: 'Info: for information',
    },
    size: { sm: 'Small', md: 'Medium (default)' },
    icon: iconNames,
  };
}
