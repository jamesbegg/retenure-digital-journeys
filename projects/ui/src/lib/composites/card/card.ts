import { afterRenderEffect, Component, ElementRef, input, output, viewChild } from '@angular/core';
import { CardHeadingLevel, CardVariant } from '../../interfaces/card';
import { Button } from '../../primitives/button/button';
import { Icon } from '../../primitives/icon/icon';
import { nextId } from '../../utils/id';

@Component({
  selector: 'ret-card',
  imports: [Button, Icon],
  templateUrl: './card.html',
  styleUrl: './card.scss',
})
export class Card {
  readonly heading = input<string>();
  readonly headingLevel = input<CardHeadingLevel>(2);
  readonly variant = input<CardVariant>('default');
  readonly editLabel = input('Edit');
  readonly answeredLabel = input('Answered');
  readonly disabled = input(false);
  readonly edit = output<void>();

  protected readonly headingId = nextId('ret-card-heading');
  private readonly section = viewChild.required<ElementRef<HTMLElement>>('section');
  private shownVariant?: CardVariant;

  constructor() {
    afterRenderEffect(() => {
      const variant = this.variant();
      const previous = this.shownVariant;
      this.shownVariant = variant;
      if (previous === undefined || previous === variant) return;
      const section = this.section().nativeElement;
      if (previous === 'answered') {
        section.querySelector<HTMLElement>('.heading')?.focus();
      } else if (variant === 'answered' && document.activeElement === document.body) {
        section.querySelector<HTMLElement>('.answer button')?.focus();
      }
    });
  }
}
