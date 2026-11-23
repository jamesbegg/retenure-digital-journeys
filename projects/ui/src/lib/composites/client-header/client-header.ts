import { Component, input, output } from '@angular/core';
import { ClientHeaderLayout, ClientHeaderProgress } from '../../interfaces/client-header';
import { Icon } from '../../primitives/icon/icon';
import { ProgressBar } from '../../primitives/progress-bar/progress-bar';

@Component({
  selector: 'ret-client-header',
  imports: [Icon, ProgressBar],
  templateUrl: './client-header.html',
  styleUrl: './client-header.scss',
  host: { '[attr.data-layout]': 'layout()' },
})
export class ClientHeader {
  readonly firmName = input.required<string>();
  readonly firmMark = input.required<string>();
  readonly layout = input<ClientHeaderLayout>('mobile');
  readonly progress = input<ClientHeaderProgress>();
  readonly backLabel = input<string>();
  readonly backHref = input<string>();
  readonly back = output<void>();
}
