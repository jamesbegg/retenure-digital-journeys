import { Component, input, output } from '@angular/core';
import { ButtonIconPosition, ButtonSize, ButtonType, ButtonVariant } from '../../interfaces/button';
import { IconName } from '../../interfaces/icon';
import { Icon } from '../icon/icon';

@Component({
  selector: 'ret-button',
  imports: [Icon],
  templateUrl: './button.html',
  styleUrl: './button.scss',
})
export class Button {
  readonly label = input.required<string>();
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('lg');
  readonly icon = input<IconName>();
  readonly iconPosition = input<ButtonIconPosition>('leading');
  readonly type = input<ButtonType>('button');
  readonly disabled = input(false);
  readonly pending = input(false);
  readonly pendingLabel = input('Please wait');
  readonly describedBy = input<string>();
  readonly pressed = output<void>();

  protected press(event: MouseEvent) {
    if (this.pending()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.pressed.emit();
  }
}
