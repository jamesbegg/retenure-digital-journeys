import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  Renderer2,
  viewChild,
} from '@angular/core';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  CircleCheck,
  Info,
  LoaderCircle,
  Mail,
  Pencil,
  TriangleAlert,
  X,
} from 'lucide';
import { IconName, IconSize, IconTone } from '../../interfaces/icon';

const ICONS = {
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  check: Check,
  'circle-alert': CircleAlert,
  'circle-check': CircleCheck,
  info: Info,
  'loader-circle': LoaderCircle,
  mail: Mail,
  pencil: Pencil,
  'triangle-alert': TriangleAlert,
  x: X,
} satisfies Record<IconName, typeof Check>;

@Component({
  selector: 'ret-icon',
  templateUrl: './icon.html',
  styleUrl: './icon.scss',
  host: { '[attr.data-size]': 'size()', '[attr.data-tone]': 'tone()' },
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly label = input<string>();
  readonly size = input<IconSize>('md');
  readonly tone = input<IconTone>('current');

  protected readonly accessibleName = computed(() => this.label()?.trim() || null);

  private readonly svg = viewChild.required<ElementRef<SVGElement>>('svg');
  private readonly renderer = inject(Renderer2);

  constructor() {
    effect(() => {
      const svg = this.svg().nativeElement;
      while (svg.firstChild) this.renderer.removeChild(svg, svg.firstChild);
      for (const [tag, attrs] of ICONS[this.name()]) {
        const child = this.renderer.createElement(tag, 'svg');
        for (const [key, value] of Object.entries(attrs)) {
          this.renderer.setAttribute(child, key, String(value));
        }
        this.renderer.appendChild(svg, child);
      }
    });
  }
}
