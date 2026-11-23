import { Component, computed, input } from '@angular/core';
import { ProgressBarVariant } from '../../interfaces/progress-bar';
import { nextId } from '../../utils/id';

@Component({
  selector: 'ret-progress-bar',
  templateUrl: './progress-bar.html',
  styleUrl: './progress-bar.scss',
})
export class ProgressBar {
  readonly label = input.required<string>();
  readonly step = input.required<number>();
  readonly total = input.required<number>();
  readonly valueText = input.required<string>();
  readonly meta = input('');
  readonly variant = input<ProgressBarVariant>('segmented');

  protected readonly labelId = nextId('ret-progress-label');
  protected readonly metaId = nextId('ret-progress-meta');
  protected readonly segments = computed(() =>
    Array.from({ length: this.total() }, (_, index) => index < this.step()),
  );
  protected readonly percent = computed(() =>
    this.total() > 0 ? Math.min(100, Math.round((this.step() / this.total()) * 100)) : 0,
  );
}
