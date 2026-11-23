import { Component, computed, input } from '@angular/core';
import { ProgressBarVariant } from '../../interfaces/progress-bar';

@Component({
  selector: 'ret-progress-bar',
  templateUrl: './progress-bar.html',
  styleUrl: './progress-bar.scss',
})
export class ProgressBar {
  readonly label = input.required<string>();
  readonly step = input.required<number>();
  readonly total = input.required<number>();
  readonly meta = input('');
  readonly variant = input<ProgressBarVariant>('segmented');

  protected readonly segments = computed(() =>
    Array.from({ length: this.total() }, (_, index) => index < this.step()),
  );
  protected readonly percent = computed(() =>
    Math.min(100, Math.round((this.step() / this.total()) * 100)),
  );
}
