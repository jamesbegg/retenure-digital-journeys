import type { Type } from '@angular/core';

export const stories: Record<string, () => Promise<Type<unknown>>> = {
  'journey-shell': () =>
    import('./lib/layouts/journey-shell/journey-shell.story').then((m) => m.JourneyShellStory),
};
