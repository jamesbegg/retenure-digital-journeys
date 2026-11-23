import { Component, input, output } from '@angular/core';
import { ClientHeaderProgress } from '../../interfaces/client-header';
import { Icon } from '../../primitives/icon/icon';
import { ProgressBar } from '../../primitives/progress-bar/progress-bar';

@Component({
  selector: 'ret-client-header',
  imports: [Icon, ProgressBar],
  templateUrl: './client-header.html',
  styleUrl: './client-header.scss',
})
export class ClientHeader {
  readonly firmName = input.required<string>();
  readonly firmMark = input.required<string>();
  readonly progress = input<ClientHeaderProgress>();
  readonly backLabel = input<string>();
  readonly backHref = input<string>();
  readonly back = output<void>();
}
