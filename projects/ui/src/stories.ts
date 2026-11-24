import type { Type } from '@angular/core';

export const stories: Record<string, () => Promise<Type<unknown>>> = {
  'action-bar': () =>
    import('./lib/composites/action-bar/action-bar.story').then((m) => m.ActionBarStory),
  button: () => import('./lib/primitives/button/button.story').then((m) => m.ButtonStory),
  card: () => import('./lib/composites/card/card.story').then((m) => m.CardStory),
  'fact-card': () =>
    import('./lib/composites/fact-card/fact-card.story').then((m) => m.FactCardStory),
  'question-renderer': () =>
    import('./lib/composites/question-renderer/question-renderer.story').then(
      (m) => m.QuestionRendererStory,
    ),
  'field-messages': () =>
    import('./lib/primitives/field-messages/field-messages.story').then(
      (m) => m.FieldMessagesStory,
    ),
  icon: () => import('./lib/primitives/icon/icon.story').then((m) => m.IconStory),
  'journey-shell': () =>
    import('./lib/layouts/journey-shell/journey-shell.story').then((m) => m.JourneyShellStory),
  'radio-group': () =>
    import('./lib/primitives/radio-group/radio-group.story').then((m) => m.RadioGroupStory),
  'text-field': () =>
    import('./lib/primitives/text-field/text-field.story').then((m) => m.TextFieldStory),
  'yes-no': () => import('./lib/primitives/yes-no/yes-no.story').then((m) => m.YesNoStory),
  'adviser-contact': () =>
    import('./lib/composites/adviser-contact/adviser-contact.story').then(
      (m) => m.AdviserContactStory,
    ),
  badge: () => import('./lib/primitives/badge/badge.story').then((m) => m.BadgeStory),
  'client-header': () =>
    import('./lib/composites/client-header/client-header.story').then((m) => m.ClientHeaderStory),
  modal: () => import('./lib/composites/modal/modal.story').then((m) => m.ModalStory),
  notice: () => import('./lib/composites/notice/notice.story').then((m) => m.NoticeStory),
  steps: () => import('./lib/composites/steps/steps.story').then((m) => m.StepsStory),
  'progress-bar': () =>
    import('./lib/primitives/progress-bar/progress-bar.story').then((m) => m.ProgressBarStory),
};
