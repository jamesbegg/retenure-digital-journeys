import { DOCUMENT } from '@angular/common';
import { afterNextRender, Component, inject, Injector } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { CheckInNavigation } from '../journeys/check-in/check-in-navigation';

@Component({
  selector: 'ret-check-in',
  imports: [RouterOutlet],
  templateUrl: './check-in-root.html',
})
export class CheckInRoot {
  constructor() {
    inject(CheckInNavigation);
    const document = inject(DOCUMENT);
    const injector = inject(Injector);
    let first = true;
    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        // Opening the link is not a change of page, so it keeps the skip link first in the tab order.
        if (first) {
          first = false;
          return;
        }
        afterNextRender(() => document.querySelector('h1')?.focus(), { injector });
      });
  }
}
