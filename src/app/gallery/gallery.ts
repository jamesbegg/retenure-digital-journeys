import { DOCUMENT } from '@angular/common';
import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'ret-gallery',
  imports: [RouterLink, RouterOutlet],
  templateUrl: './gallery.html',
  styleUrl: './gallery.scss',
})
export class Gallery {
  private readonly query = toSignal(inject(ActivatedRoute).queryParamMap);
  protected readonly large = computed(() => this.query()?.get('text') === '200');
  private readonly root = inject(DOCUMENT).documentElement;

  constructor() {
    effect(() => (this.root.style.fontSize = this.large() ? '200%' : ''));
  }
}
