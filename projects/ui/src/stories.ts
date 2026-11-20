import type { Type } from '@angular/core';

export const stories: Record<string, () => Promise<Type<unknown>>> = {
  icon: () => import('./lib/primitives/icon/icon.story').then((m) => m.IconStory),
  'journey-shell': () =>
    import('./lib/layouts/journey-shell/journey-shell.story').then((m) => m.JourneyShellStory),
};
