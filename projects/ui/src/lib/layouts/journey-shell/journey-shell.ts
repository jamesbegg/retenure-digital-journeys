import {
  afterRenderEffect,
  Component,
  computed,
  ElementRef,
  input,
  viewChild,
} from '@angular/core';
import { ShellBranding, ShellLayout, ShellState } from '../../interfaces/journey-shell';
import { nextId } from '../../utils/id';

@Component({
  selector: 'ret-journey-shell',
  templateUrl: './journey-shell.html',
  styleUrl: './journey-shell.scss',
  host: { '[attr.data-layout]': 'layout()' },
})
export class JourneyShell {
  readonly heading = input.required<string>();
  readonly layout = input<ShellLayout>('default');
  readonly branding = input<ShellBranding>('firm');
  readonly state = input<ShellState>('ready');
  readonly skipLinkLabel = input('Skip to main content');
  readonly loadingLabel = input('Loading');

  protected readonly mainId = nextId('ret-main');
  protected readonly showBrand = computed(
    () => this.branding() === 'firm' && this.state() !== 'loading',
  );
  protected readonly steps = computed(
    () => this.layout() === 'with-steps' && this.state() === 'ready',
  );

  private readonly headingRef = viewChild<ElementRef<HTMLElement>>('title');
  private shownState?: ShellState;

  constructor() {
    afterRenderEffect(() => {
      const state = this.state();
      const changed = this.shownState !== undefined && this.shownState !== state;
      this.shownState = state;
      if (changed && (state === 'error' || state === 'blocked')) {
        this.headingRef()?.nativeElement.focus();
      }
    });
  }

  protected skipToMain(event: Event, main: HTMLElement) {
    event.preventDefault();
    main.focus();
  }
}
