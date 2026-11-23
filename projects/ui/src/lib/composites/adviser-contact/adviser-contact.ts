import { Component, computed, input } from '@angular/core';
import { AdviserContactVariant } from '../../interfaces/adviser-contact';
import { Icon } from '../../primitives/icon/icon';

@Component({
  selector: 'ret-adviser-contact',
  imports: [Icon],
  templateUrl: './adviser-contact.html',
  styleUrl: './adviser-contact.scss',
  host: { '[attr.data-variant]': 'variant()' },
})
export class AdviserContact {
  readonly name = input.required<string>();
  readonly initials = input.required<string>();
  readonly email = input.required<string>();
  readonly contactLine = input.required<string>();
  readonly emailLabel = input.required<string>();
  readonly jobTitle = input<string>();
  readonly phone = input<string>();
  readonly label = input.required<string>();
  readonly variant = input<AdviserContactVariant>('full');

  protected readonly tel = computed(() => this.phone()?.replace(/\s/g, ''));
}
