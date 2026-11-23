import { Component, input } from '@angular/core';
import { StepItem } from '../../interfaces/steps';
import { Icon } from '../../primitives/icon/icon';

@Component({
  selector: 'ret-steps',
  imports: [Icon],
  templateUrl: './steps.html',
  styleUrl: './steps.scss',
})
export class Steps {
  readonly items = input.required<StepItem[]>();
  // Read out before a finished step's label, because the tick alone says nothing to a screen reader.
  readonly doneLabel = input<string>();
}
