import { Component, signal } from '@angular/core';
import { SectionAnswers } from '../../interfaces/answer';
import { JourneyCopy } from '../../interfaces/journey-copy';
import {
  RenderableBlock,
  RenderableQuestion,
  RenderableSection,
} from '../../interfaces/question-renderer';
import { Variants } from '../../interfaces/story';
import { QuestionRenderer } from './question-renderer';

const copy: JourneyCopy = {
  continue: 'Continue',
  back: 'Back',
  edit: 'Edit',
  submit: 'Send my answers',
  submitting: 'Sending your answers',
  checkAnswersTitle: 'Check your answers',
  required: 'Answer this question to continue',
  errorPrefix: 'Error:',
  dateLabels: { day: 'Day', month: 'Month', year: 'Year' },
  incompleteDate: 'Enter a day, month and year',
  invalidDate: 'Enter a real date',
  stillRight: 'Still right',
  somethingChanged: "Something's changed",
  leaveWarning: 'If you leave, your answers will not be saved',
  timeoutWarning: "You've been inactive. Do you need more time?",
  moreTime: 'I need more time',
  followUpsCleared: 'Answers to the follow-up questions were cleared',
  confirm: 'Confirm',
  makeChange: 'Make a change',
  confirmed: 'Confirmed',
  cancel: 'Cancel',
  save: 'Save',
  factNote: 'Anything I should know?',
  contactLine: "Rather talk it through? Email me and we'll arrange a call.",
  urgentLink: 'Something urgent or worrying you?',
  sendTo: 'Send to {adviser}',
  doneTitle: "Thank you, {name}. We've received your answers.",
  doneBody: '{adviser} will be in touch.',
  close: 'Close',
  emailAdviser: 'Email {adviser}',
  adviserLabel: 'Your adviser',
  progressValue: 'Step {step} of {total}',
  moneyUnreadable: 'Enter an amount in pounds, like 250 or 250.50',
};

const base = { version: 1, required: true } as const;

const questions: RenderableQuestion[] = [
  {
    ...base,
    id: 'goal',
    kind: 'confirmFacts',
    prompt: 'Is this still your goal?',
    facts: [{ id: 'f1', label: 'Retire at 60', value: 'target £500,000 by 2040' }],
  },
  {
    ...base,
    id: 'working',
    kind: 'yesNo',
    prompt: 'Priya, are you still working at your new job?',
    detail: { when: false, label: 'What are you doing now?', required: true },
  },
  {
    ...base,
    id: 'helper',
    kind: 'radio',
    prompt: "Who will help most with the children's costs this year?",
    options: [
      { value: 'o1', label: 'Priya' },
      { value: 'o2', label: 'Dev' },
      {
        value: 'o3',
        label: 'A relative',
        hint: 'Or a friend, for example',
        input: { label: 'Who is that?', type: 'text', required: true },
      },
    ],
  },
  { ...base, id: 'pay', kind: 'money', prompt: 'What is your yearly pay at your new job?' },
  { ...base, id: 'purchase', kind: 'date', prompt: 'When do you expect to buy the car?' },
  {
    ...base,
    id: 'anything',
    kind: 'text',
    multiline: true,
    required: false,
    prompt: 'Is there anything else you want us to know? (optional)',
  },
];

@Component({
  selector: 'ret-question-renderer-story',
  imports: [QuestionRenderer],
  templateUrl: './question-renderer.story.html',
})
export class QuestionRendererStory {
  protected readonly variants: Variants<QuestionRenderer> = {};

  protected readonly copy = copy;
  protected readonly section: RenderableSection = {
    id: 'story',
    title: 'One of every kind',
    blocks: questions.map((question): RenderableBlock => ({ type: 'card', question })),
  };
  protected readonly answers = signal<SectionAnswers>({});
  protected readonly complete = signal(false);
}
