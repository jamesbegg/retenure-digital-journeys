import { effect, inject, Injectable, untracked } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { JourneyStage } from '../../interfaces/journey-service';
import { JourneyService } from '../../journey/journey.service';

export const welcomePath = '/check-in/welcome';
export const reviewPath = '/check-in/review';
export const sectionPath = (id: string) => `/check-in/section/${encodeURIComponent(id)}`;

const stagePaths = {
  'link-problem': '/link-problem',
  verify: '/start',
  loading: '/start',
  done: '/check-in/done',
  'already-completed': '/already-completed',
  expired: '/expired',
  locked: '/locked',
  'link-reissued': '/link-reissued',
  'link-requested': '/link-requested',
  error: '/error',
} satisfies Record<Exclude<JourneyStage, 'ready'>, string>;

// The journey service decides the stage. This sends the browser to the page for it, and brings
// the client back to where they were once a lapsed session is verified again.
@Injectable({ providedIn: 'root' })
export class CheckInNavigation {
  private readonly router = inject(Router);
  private readonly journey = inject(JourneyService);
  private returnTo: string | null = null;

  constructor() {
    let previous = this.journey.stage();
    effect(() => {
      const stage = this.journey.stage();
      untracked(() => {
        // The first stage is the guards' business, so a deep link is not lost.
        if (stage === previous) return;
        if (previous === 'ready' && stage === 'verify') this.returnTo = this.router.url;
        previous = stage;
        void this.router.navigateByUrl(this.pathFor(stage), { replaceUrl: true });
      });
    });
  }

  // A route for the wrong stage goes to the right one. A section link wanted before the client is
  // verified is kept, so verifying lands there.
  redirect(wanted: string): UrlTree {
    const stage = this.journey.stage();
    if (wanted.startsWith('/check-in/') && (stage === 'verify' || stage === 'loading')) {
      this.returnTo = wanted;
    }
    return this.router.parseUrl(this.pathFor(stage));
  }

  private pathFor(stage: JourneyStage): string {
    if (stage !== 'ready') return stagePaths[stage];
    const path = this.returnTo ?? welcomePath;
    this.returnTo = null;
    return path;
  }
}

export const inStage =
  (...stages: JourneyStage[]): CanActivateFn =>
  (_route, state) =>
    stages.includes(inject(JourneyService).stage()) ||
    inject(CheckInNavigation).redirect(state.url);
