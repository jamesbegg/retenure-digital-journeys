import { Component, input } from '@angular/core';
import { BadgeSize, BadgeTone } from '../../interfaces/badge';
import { IconName } from '../../interfaces/icon';
import { Icon } from '../icon/icon';

@Component({
  selector: 'ret-badge',
  imports: [Icon],
  templateUrl: './badge.html',
  styleUrl: './badge.scss',
  host: { '[attr.data-tone]': 'tone()', '[attr.data-size]': 'size()' },
})
export class Badge {
  readonly label = input.required<string>();
  readonly tone = input<BadgeTone>('neutral');
  readonly size = input<BadgeSize>('md');
  readonly icon = input<IconName>();
}
