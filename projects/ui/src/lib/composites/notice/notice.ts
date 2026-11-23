import { Component, computed, input } from '@angular/core';
import { IconName, IconTone } from '../../interfaces/icon';
import { NoticeLive, NoticeTone } from '../../interfaces/notice';
import { Icon } from '../../primitives/icon/icon';

const ICONS = {
  info: 'info',
  success: 'circle-check',
  warning: 'triangle-alert',
  danger: 'circle-alert',
  neutral: 'info',
} satisfies Record<NoticeTone, IconName>;

const ICON_TONES = {
  info: 'info',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  neutral: 'current',
} satisfies Record<NoticeTone, IconTone>;

const ROLES = { off: null, polite: 'status', assertive: 'alert' } satisfies Record<
  NoticeLive,
  string | null
>;

@Component({
  selector: 'ret-notice',
  imports: [Icon],
  templateUrl: './notice.html',
  styleUrl: './notice.scss',
  host: { '[attr.data-tone]': 'tone()' },
})
export class Notice {
  readonly body = input.required<string>();
  readonly heading = input<string>();
  readonly tone = input<NoticeTone>('info');
  readonly live = input<NoticeLive>('off');

  protected readonly role = computed(() => ROLES[this.live()]);
  protected readonly icon = computed(() => ICONS[this.tone()]);
  protected readonly iconTone = computed(() => ICON_TONES[this.tone()]);
}
