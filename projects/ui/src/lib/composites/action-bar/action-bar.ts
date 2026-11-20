import { Component, computed, input, output } from '@angular/core';
import { ActionBarActions } from '../../interfaces/action-bar';
import { Button } from '../../primitives/button/button';

@Component({
  selector: 'ret-action-bar',
  imports: [Button],
  templateUrl: './action-bar.html',
  styleUrl: './action-bar.scss',
})
export class ActionBar {
  readonly actions = input.required<ActionBarActions>();
  readonly pending = input(false);
  readonly hidden = input(false);
  readonly primaryPressed = output<void>();
  readonly secondaryPressed = output<void>();
  readonly linkPressed = output<void>();

  protected readonly labels = computed(() => {
    const actions = this.actions();
    switch (actions.kind) {
      case 'single':
        return { primary: actions.primary, secondary: null };
      case 'pair':
        return { primary: actions.primary, secondary: actions.secondary };
      case 'edit':
        return { primary: actions.save, secondary: actions.cancel };
      default: {
        const _exhaustive: never = actions;
        return _exhaustive;
      }
    }
  });
}
