import type { Type } from '@angular/core';

export const stories: Record<string, () => Promise<Type<unknown>>> = {
  'action-bar': () =>
    import('./lib/composites/action-bar/action-bar.story').then((m) => m.ActionBarStory),
  button: () => import('./lib/primitives/button/button.story').then((m) => m.ButtonStory),
  card: () => import('./lib/composites/card/card.story').then((m) => m.CardStory),
  icon: () => import('./lib/primitives/icon/icon.story').then((m) => m.IconStory),
  'journey-shell': () =>
    import('./lib/layouts/journey-shell/journey-shell.story').then((m) => m.JourneyShellStory),
  'text-field': () =>
    import('./lib/primitives/text-field/text-field.story').then((m) => m.TextFieldStory),
};
