import { Component, signal, viewChild } from '@angular/core';
import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { SectionAnswers } from '../../interfaces/answer';
import { JourneyCopy } from '../../interfaces/journey-copy';
import { Block, Question, Section } from '../../interfaces/question';
import { QuestionRenderer } from './question-renderer';

const copy: JourneyCopy = {
  continue: 'Continue',
  back: 'Back',
  edit: 'Edit',
  submit: 'Send',
  submitting: 'Sending',
  checkAnswersTitle: 'Check your answers',
  required: 'Answer this question to continue',
  errorPrefix: 'Error:',
  dateLabels: { day: 'Day', month: 'Month', year: 'Year' },
  incompleteDate: 'Enter a day, month and year',
  invalidDate: 'Enter a real date',
  stillRight: 'Still right',
  somethingChanged: "Something's changed",
  leaveWarning: 'leave',
  timeoutWarning: 'timeout',
  moreTime: 'more time',
  followUpsCleared: 'cleared',
  confirm: 'Confirm',
  makeChange: 'Make a change',
  confirmed: 'Confirmed',
  cancel: 'Cancel',
  save: 'Save',
  factNote: 'Anything I should know?',
  contactLine: 'contact',
  urgentLink: 'urgent',
  sendTo: 'Send to {adviser}',
  doneTitle: 'Done',
  doneBody: 'Done',
  alreadyCompletedTitle: 'Done',
  alreadyCompletedBody: 'Done',
  notYou: 'Not you',
  close: 'Close',
  emailAdviser: 'Email',
  adviserLabel: 'Adviser',
  progressValue: 'Step',
  moneyUnreadable: 'Enter an amount in pounds, like 250 or 250.50',
};

const base = { version: 1, required: true } as const;
const card = (question: Question): Block => ({ type: 'card', question });

const working: Question = {
  ...base,
  id: 'working',
  prompt: 'Are you still working?',
  kind: 'yesNo',
  detail: { when: false, label: 'What are you doing now?', required: true },
};
const pay: Question = {
  ...base,
  id: 'pay',
  prompt: 'What is your yearly pay?',
  kind: 'money',
  validators: [
    {
      rule: 'moneyAmount',
      max: 1000000,
      messages: { unreadable: 'Enter pay as numbers', tooLow: 'Too low', tooHigh: 'Too high' },
    },
  ],
};
const helper: Question = {
  ...base,
  id: 'helper',
  prompt: 'Who helps most?',
  kind: 'radio',
  options: [
    { value: 'a', label: 'Priya' },
    { value: 'b', label: 'Dev' },
    {
      value: 'c',
      label: 'A relative',
      input: { label: 'Who is that?', type: 'text', required: true },
    },
  ],
};
const email: Question = {
  ...base,
  id: 'email',
  prompt: 'What is your email?',
  kind: 'text',
  multiline: false,
  validators: [{ rule: 'emailAddress', message: 'Enter an email like name@example.com' }],
};
const purchase: Question = {
  ...base,
  id: 'purchase',
  prompt: 'When is the purchase?',
  kind: 'date',
};
const goal: Question = {
  ...base,
  id: 'goal',
  prompt: 'Is this still your goal?',
  kind: 'confirmFacts',
  facts: [{ id: 'f1', label: 'Retire at 60', value: 'target £500,000 by 2040' }],
};
const extra: Question = {
  ...base,
  id: 'extra',
  prompt: 'Anything else?',
  kind: 'text',
  multiline: true,
  required: false,
};

const section = (...questions: Question[]): Section => ({
  id: 's1',
  title: 'Section',
  blocks: questions.map(card),
});

@Component({
  selector: 'ret-host',
  imports: [QuestionRenderer],
  template: `<ret-question-renderer
    [section]="section()"
    [copy]="copy"
    [(answers)]="answers"
    (complete)="completes.push($event)"
  />`,
})
class Host {
  readonly renderer = viewChild.required(QuestionRenderer);
  readonly section = signal<Section>(section(working));
  readonly copy = copy;
  readonly answers = signal<SectionAnswers>({});
  readonly completes: boolean[] = [];
}

const scrollIntoView = vi.fn();
let reducedMotion = false;

beforeEach(() => {
  scrollIntoView.mockClear();
  reducedMotion = false;
  Element.prototype.scrollIntoView = scrollIntoView;
  window.matchMedia = ((query: string) => ({
    matches: reducedMotion && query.includes('prefers-reduced-motion'),
  })) as typeof window.matchMedia;
});

async function renderSection(s: Section, answers: SectionAnswers = {}) {
  const view = await render(Host);
  const host = view.fixture.componentInstance;
  host.section.set(s);
  host.answers.set(answers);
  view.fixture.componentRef.changeDetectorRef.markForCheck();
  await view.fixture.whenStable();
  const settle = () => view.fixture.whenStable();
  return { ...view, host, settle, user: userEvent.setup() };
}

const last = (host: Host) => host.completes.at(-1);

const description = (el: HTMLElement) =>
  (el.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent?.trim());

describe('QuestionRenderer', () => {
  describe('progressive disclosure', () => {
    it('shows only the first question until it is answered', async () => {
      await renderSection(section(working, pay));
      screen.getByText('Are you still working?');
      expect(screen.queryByText('What is your yearly pay?')).toBeNull();
    });

    it('reveals the next question and scrolls it into view once the current one is answered', async () => {
      const { user, settle } = await renderSection(section(working, pay));
      await user.click(screen.getByRole('radio', { name: 'Yes' }));
      await settle();
      screen.getByRole('textbox', { name: 'What is your yearly pay?' });
      expect(scrollIntoView).toHaveBeenCalledTimes(1);
      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'nearest' });
    });

    it('does not animate the scroll when the client prefers reduced motion', async () => {
      reducedMotion = true;
      const { user, settle } = await renderSection(section(working, pay));
      await user.click(screen.getByRole('radio', { name: 'Yes' }));
      await settle();
      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'nearest' });
    });

    it('does not scroll on first render', async () => {
      await renderSection(section(working, pay));
      expect(scrollIntoView).not.toHaveBeenCalled();
    });

    it('counts a text answer once it is non-blank and valid, so the next card exists before blur', async () => {
      const { user, settle } = await renderSection(section(email, pay));
      const field = screen.getByRole('textbox', { name: 'What is your email?' });
      await user.type(field, 'a@b');
      await settle();
      expect(screen.queryByText('What is your yearly pay?')).toBeNull();
      await user.type(field, '.test');
      await settle();
      screen.getByRole('textbox', { name: 'What is your yearly pay?' });
    });

    it('lands a tab out of a money field on the next card first control', async () => {
      const { user, settle } = await renderSection(section(pay, email));
      await user.type(screen.getByRole('textbox', { name: 'What is your yearly pay?' }), '40000');
      await settle();
      await user.tab();
      expect(document.activeElement).toBe(
        screen.getByRole('textbox', { name: 'What is your email?' }),
      );
    });

    it('lands a tab out of the date year on the next card', async () => {
      const { user, settle } = await renderSection(section(purchase, email));
      await user.click(screen.getByRole('textbox', { name: 'Year' }));
      await user.paste('14/03/1996');
      await settle();
      await user.tab();
      expect(document.activeElement).toBe(
        screen.getByRole('textbox', { name: 'What is your email?' }),
      );
    });

    it('reveals a required radio option input card as soon as the input has text', async () => {
      const { user, settle } = await renderSection(section(helper, email));
      await user.click(screen.getByRole('radio', { name: 'A relative' }));
      await settle();
      expect(screen.queryByText('What is your email?')).toBeNull();
      await user.type(screen.getByRole('textbox', { name: 'Who is that?' }), 'A');
      await settle();
      screen.getByRole('textbox', { name: 'What is your email?' });
    });

    it('does not flip an optional text to unanswered while typing', async () => {
      const { user, settle, host } = await renderSection(section(extra));
      await settle();
      host.completes.length = 0;
      await user.type(screen.getByRole('textbox', { name: 'Anything else?' }), 'Some words');
      await settle();
      expect(host.completes.every(Boolean)).toBe(true);
      expect(host.answers()['extra']).toEqual({ kind: 'text', value: 'Some words' });
    });

    it('reveals three questions in order', async () => {
      const { user, settle } = await renderSection(section(working, pay, email));
      const shown = () => screen.queryAllByRole('textbox').length;
      expect(shown()).toBe(0);
      await user.click(screen.getByRole('radio', { name: 'Yes' }));
      await settle();
      screen.getByRole('textbox', { name: 'What is your yearly pay?' });
      expect(screen.queryByText('What is your email?')).toBeNull();
      await user.type(screen.getByRole('textbox', { name: 'What is your yearly pay?' }), '5');
      await settle();
      screen.getByRole('textbox', { name: 'What is your email?' });
    });

    it('scrolls the newly revealed card, not an earlier one', async () => {
      const { user, settle } = await renderSection(section(working, pay));
      await user.click(screen.getByRole('radio', { name: 'Yes' }));
      await settle();
      const target = scrollIntoView.mock.contexts[0] as HTMLElement;
      expect(
        target.contains(screen.getByRole('textbox', { name: 'What is your yearly pay?' })),
      ).toBe(true);
      expect(target.contains(screen.getByRole('radio', { name: 'Yes' }))).toBe(false);
    });

    it('keeps answered questions visible and editable', async () => {
      const { user, settle, host } = await renderSection(section(working, pay));
      await user.click(screen.getByRole('radio', { name: 'Yes' }));
      await settle();
      await user.click(screen.getByRole('radio', { name: 'No' }));
      await settle();
      screen.getByRole('textbox', { name: 'What are you doing now?' });
      screen.getByRole('textbox', { name: 'What is your yearly pay?' });
      expect(host.answers()['working']).toBeUndefined();
    });

    it('keeps later questions when an earlier answer is edited to a new answer', async () => {
      const { user, settle, host } = await renderSection(section(working, pay));
      await user.click(screen.getByRole('radio', { name: 'Yes' }));
      await settle();
      const field = screen.getByRole('textbox', { name: 'What is your yearly pay?' });
      await user.type(field, '40000');
      await user.tab();
      await settle();
      await user.click(screen.getByRole('radio', { name: 'No' }));
      await user.type(screen.getByRole('textbox', { name: 'What are you doing now?' }), 'Studying');
      await user.tab();
      await settle();
      screen.getByRole('textbox', { name: 'What is your yearly pay?' });
      expect(host.answers()).toEqual({
        working: { kind: 'yesNo', value: false, detail: 'Studying' },
        pay: { kind: 'money', value: '40000' },
      });
      expect(last(host)).toBe(true);
    });

    it('marks the card being answered as current', async () => {
      const { user, settle } = await renderSection(section(working, pay));
      const first = () => screen.getByRole('group', { name: 'Are you still working?' });
      expect(first().closest('[aria-current]')?.getAttribute('aria-current')).toBe('true');
      await user.click(screen.getByRole('radio', { name: 'Yes' }));
      await settle();
      expect(first().closest('[aria-current]')).toBeNull();
    });

    it('shows the next question straight away after an optional one', async () => {
      await renderSection(section(extra, pay));
      screen.getByRole('textbox', { name: 'What is your yearly pay?' });
    });
  });

  describe('errors', () => {
    it('does not show an error while typing, only after blur', async () => {
      const { user, settle } = await renderSection(section(email));
      const field = screen.getByRole('textbox', { name: 'What is your email?' });
      await user.type(field, 'not an email');
      await settle();
      expect(screen.queryByText(/Enter an email/)).toBeNull();
      await user.tab();
      await settle();
      screen.getByText('Enter an email like name@example.com');
      expect(field.getAttribute('aria-invalid')).toBe('true');
    });

    it('clears the error as soon as the field becomes valid', async () => {
      const { user, settle } = await renderSection(section(email));
      const field = screen.getByRole('textbox', { name: 'What is your email?' });
      await user.type(field, 'bad');
      await user.tab();
      await settle();
      await user.type(field, '@example.test');
      await settle();
      expect(screen.queryByText(/Enter an email/)).toBeNull();
    });

    it('asks for a required text answer blurred while blank and does not count it', async () => {
      const { user, settle, host } = await renderSection(section(email, pay));
      await user.click(screen.getByRole('textbox', { name: 'What is your email?' }));
      await user.tab();
      await settle();
      screen.getByText('Answer this question to continue');
      expect(screen.queryByText('What is your yearly pay?')).toBeNull();
      expect(last(host)).toBe(false);
    });

    it('treats whitespace as blank', async () => {
      const { user, settle, host } = await renderSection(section(email));
      await user.type(screen.getByRole('textbox', { name: 'What is your email?' }), '   ');
      await user.tab();
      await settle();
      screen.getByText('Answer this question to continue');
      expect(host.answers()).toEqual({});
    });

    it('shows errors for every shown question when asked to', async () => {
      const { host, settle } = await renderSection(section(email));
      expect(screen.queryByText(/Answer this question/)).toBeNull();
      host.renderer().showErrors();
      await settle();
      screen.getByText('Answer this question to continue');
    });

    it('uses the money validator message for unreadable text', async () => {
      const { user, settle } = await renderSection(section(pay));
      await user.type(screen.getByRole('textbox', { name: 'What is your yearly pay?' }), 'lots');
      await user.tab();
      await settle();
      screen.getByText('Enter pay as numbers');
    });

    it('uses the moneyUnreadable copy for unreadable money with no configured text', async () => {
      const { user, settle } = await renderSection(section({ ...pay, validators: undefined }));
      await user.type(screen.getByRole('textbox', { name: 'What is your yearly pay?' }), 'lots');
      await user.tab();
      await settle();
      screen.getByText('Enter an amount in pounds, like 250 or 250.50');
      expect(screen.queryByText('Answer this question to continue')).toBeNull();
    });

    it('uses the moneyUnreadable copy inside a money option input', async () => {
      const money: Question = {
        ...helper,
        options: [
          helper.kind === 'radio' ? helper.options[0] : { value: 'a', label: 'Priya' },
          { value: 'b', label: 'Dev' },
          {
            value: 'c',
            label: 'Something else',
            input: { label: 'How much?', type: 'money', required: true },
          },
        ],
      };
      const { user, settle } = await renderSection(section(money));
      await user.click(screen.getByRole('radio', { name: 'Something else' }));
      await user.type(screen.getByRole('textbox', { name: 'How much?' }), 'lots');
      await user.tab();
      await settle();
      const field = screen.getByRole('textbox', { name: 'How much?' });
      expect(description(field)).toContain('Error: Enter an amount in pounds, like 250 or 250.50');
    });

    it('shows an option input validator message inside that option own field', async () => {
      const checked: Question = {
        ...helper,
        options: [
          { value: 'a', label: 'Priya' },
          { value: 'b', label: 'Dev' },
          {
            value: 'c',
            label: 'Someone else',
            input: {
              label: 'Their email?',
              type: 'text',
              required: true,
              validators: [{ rule: 'emailAddress', message: 'Enter a real email address' }],
            },
          },
        ],
      };
      const { user, settle } = await renderSection(section(checked));
      await user.click(screen.getByRole('radio', { name: 'Someone else' }));
      await user.type(screen.getByRole('textbox', { name: 'Their email?' }), 'nope');
      await user.tab();
      await settle();
      const field = screen.getByRole('textbox', { name: 'Their email?' });
      expect(field.getAttribute('aria-invalid')).toBe('true');
      expect(description(field)).toContain('Error: Enter a real email address');
    });

    it('shows copy.required on an unconfirmed FactCard when errors are asked for', async () => {
      const { host, settle } = await renderSection(section(goal));
      host.renderer().showErrors();
      await settle();
      const region = screen.getByRole('region', { name: 'Is this still your goal?' });
      within(region).getByText('Answer this question to continue');
      expect(region.getAttribute('aria-describedby')).toBeTruthy();
    });

    it('moves focus to the first invalid field when errors are asked for', async () => {
      const { host, settle } = await renderSection(section(email, pay));
      host.renderer().showErrors();
      await settle();
      expect(document.activeElement).toBe(
        screen.getByRole('textbox', { name: 'What is your email?' }),
      );
    });

    it('moves focus to a radio option input when that holds the error', async () => {
      const { user, host, settle } = await renderSection(section(helper));
      await user.click(screen.getByRole('radio', { name: 'A relative' }));
      await settle();
      host.renderer().showErrors();
      await settle();
      expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Who is that?' }));
    });

    it('moves focus to the FactCard heading when that is what is missing', async () => {
      const { host, settle } = await renderSection(section(goal));
      host.renderer().showErrors();
      await settle();
      expect(document.activeElement).toBe(
        screen.getByRole('heading', { name: 'Is this still your goal?' }),
      );
    });
  });

  describe('per-kind answers', () => {
    it('stores YesNo with its detail only when shown, and requires the detail', async () => {
      const { user, settle, host } = await renderSection(section(working, pay));
      await user.click(screen.getByRole('radio', { name: 'No' }));
      await settle();
      expect(screen.queryByText('What is your yearly pay?')).toBeNull();
      await user.click(screen.getByRole('textbox', { name: 'What are you doing now?' }));
      await user.tab();
      await settle();
      screen.getByText('Answer this question to continue');
      expect(last(host)).toBe(false);
      await user.type(
        screen.getByRole('textbox', { name: 'What are you doing now?' }),
        ' Studying ',
      );
      await user.tab();
      await settle();
      expect(host.answers()['working']).toEqual({
        kind: 'yesNo',
        value: false,
        detail: 'Studying',
      });
      screen.getByRole('textbox', { name: 'What is your yearly pay?' });
    });

    it('drops the detail when the answer flips back', async () => {
      const { user, settle, host } = await renderSection(section(working));
      await user.click(screen.getByRole('radio', { name: 'No' }));
      await user.type(screen.getByRole('textbox', { name: 'What are you doing now?' }), 'Studying');
      await user.click(screen.getByRole('radio', { name: 'Yes' }));
      await settle();
      expect(host.answers()['working']).toEqual({ kind: 'yesNo', value: true });
    });

    it('records a radio answer with its option input and shows the input error on that field', async () => {
      const { user, settle, host } = await renderSection(section(helper, email));
      await user.click(screen.getByRole('radio', { name: 'A relative' }));
      await settle();
      expect(screen.queryByText('What is your email?')).toBeNull();
      await user.click(screen.getByRole('textbox', { name: 'Who is that?' }));
      await user.tab();
      await settle();
      const field = screen.getByRole('textbox', { name: 'Who is that?' });
      expect(field.getAttribute('aria-invalid')).toBe('true');
      screen.getByText('Answer this question to continue');
      await user.type(field, ' Aunt Jo ');
      await user.tab();
      await settle();
      expect(host.answers()['helper']).toEqual({ kind: 'radio', value: 'c', input: 'Aunt Jo' });
      screen.getByRole('textbox', { name: 'What is your email?' });
    });

    it('moves on at once for a radio option with no input', async () => {
      const { user, settle, host } = await renderSection(section(helper, email));
      await user.click(screen.getByRole('radio', { name: 'Dev' }));
      await settle();
      expect(host.answers()['helper']).toEqual({ kind: 'radio', value: 'b' });
      screen.getByRole('textbox', { name: 'What is your email?' });
    });

    it('stores money as a plain amount', async () => {
      const { user, settle, host } = await renderSection(section(pay));
      await user.type(
        screen.getByRole('textbox', { name: 'What is your yearly pay?' }),
        '£1,250.50',
      );
      await user.tab();
      await settle();
      expect(host.answers()).toEqual({ pay: { kind: 'money', value: '1250.50' } });
    });

    it('stores a date as ISO from a pasted full date and reports an incomplete one', async () => {
      const { user, settle, host } = await renderSection(section(purchase));
      await user.click(screen.getByRole('textbox', { name: 'Day' }));
      await user.paste('14/03/1996');
      await user.tab();
      await settle();
      expect(host.answers()['purchase']).toEqual({ kind: 'date', value: '1996-03-14' });
      expect(last(host)).toBe(true);
      await user.clear(screen.getByRole('textbox', { name: 'Year' }));
      await user.tab();
      await settle();
      screen.getByText('Enter a day, month and year');
      expect(host.answers()).toEqual({});
      expect(last(host)).toBe(false);
    });

    it('confirms held facts through a FactCard and moves on', async () => {
      const { user, settle, host } = await renderSection(section(goal, email));
      within(screen.getByRole('region', { name: 'Is this still your goal?' })).getByText(
        'Retire at 60',
      );
      await user.click(screen.getByRole('button', { name: 'Confirm' }));
      await settle();
      expect(host.answers()['goal']).toEqual({ kind: 'confirmFacts', changed: [] });
      screen.getByRole('textbox', { name: 'What is your email?' });
    });

    it('stores changed facts with the note', async () => {
      const { user, settle, host } = await renderSection(section(goal));
      await user.click(screen.getByRole('button', { name: 'Make a change' }));
      const fact = screen.getByRole('textbox', { name: 'Retire at 60' });
      await user.clear(fact);
      await user.type(fact, 'Retire at 62');
      await user.type(screen.getByRole('textbox', { name: 'Anything I should know?' }), 'Later');
      await user.click(screen.getByRole('button', { name: 'Save' }));
      await settle();
      expect(host.answers()['goal']).toEqual({
        kind: 'confirmFacts',
        changed: [{ factId: 'f1', newValue: 'Retire at 62' }],
        note: 'Later',
      });
    });

    it('leaves an optional blank out of the answers and still completes', async () => {
      const { host, settle } = await renderSection(section(extra));
      await settle();
      expect(host.answers()).toEqual({});
      expect(last(host)).toBe(true);
    });

    it('skips kinds it cannot render', async () => {
      const checkbox: Question = {
        ...base,
        id: 'cb',
        prompt: 'Pick some',
        kind: 'checkbox',
        options: [],
      };
      const { host, settle } = await renderSection(section(checkbox, extra));
      await settle();
      expect(screen.queryByText('Pick some')).toBeNull();
      expect(last(host)).toBe(true);
    });
  });

  describe('completion and seeding', () => {
    it('emits complete as false until every question is answered, then true', async () => {
      const { user, settle, host } = await renderSection(section(working, pay));
      expect(last(host)).toBe(false);
      await user.click(screen.getByRole('radio', { name: 'Yes' }));
      await settle();
      expect(last(host)).toBe(false);
      await user.type(screen.getByRole('textbox', { name: 'What is your yearly pay?' }), '5');
      await user.tab();
      await settle();
      expect(last(host)).toBe(true);
    });

    it('goes back to incomplete when an answer is cleared', async () => {
      const { user, settle, host } = await renderSection(section(working, pay));
      await user.click(screen.getByRole('radio', { name: 'Yes' }));
      const field = await screen.findByRole('textbox', { name: 'What is your yearly pay?' });
      await user.type(field, '5');
      await user.tab();
      await settle();
      await user.clear(field);
      await user.tab();
      await settle();
      expect(last(host)).toBe(false);
      expect(host.answers()['pay']).toBeUndefined();
    });

    it('opens with earlier answers filled in, every card shown and complete', async () => {
      const { host, settle } = await renderSection(section(working, pay), {
        working: { kind: 'yesNo', value: false, detail: 'Studying' },
        pay: { kind: 'money', value: '40000' },
      });
      await settle();
      expect(screen.getByRole('textbox', { name: 'What are you doing now?' })).toHaveProperty(
        'value',
        'Studying',
      );
      expect(screen.getByRole('textbox', { name: 'What is your yearly pay?' })).toHaveProperty(
        'value',
        '40,000',
      );
      expect(last(host)).toBe(true);
      expect(scrollIntoView).not.toHaveBeenCalled();
    });

    it('starts again when the section changes', async () => {
      const { host, user, settle } = await renderSection(section(working, pay));
      await user.click(screen.getByRole('radio', { name: 'Yes' }));
      await settle();
      host.section.set(section(email, pay));
      host.answers.set({});
      await settle();
      screen.getByRole('textbox', { name: 'What is your email?' });
      expect(screen.queryByText('Are you still working?')).toBeNull();
      expect(screen.queryByText('What is your yearly pay?')).toBeNull();
      expect(last(host)).toBe(false);
    });

    it('shows two cards for a partial seed', async () => {
      await renderSection(section(working, pay, email), {
        working: { kind: 'yesNo', value: true },
      });
      screen.getByRole('textbox', { name: 'What is your yearly pay?' });
      expect(screen.queryByText('What is your email?')).toBeNull();
    });

    it('ignores a seeded answer of the wrong kind', async () => {
      const { host, settle } = await renderSection(section(pay), {
        pay: { kind: 'text', value: 'lots' },
      });
      await settle();
      expect(screen.getByRole('textbox', { name: 'What is your yearly pay?' })).toHaveProperty(
        'value',
        '',
      );
      expect(last(host)).toBe(false);
    });

    it('shows answers the parent writes from outside, such as after re-verifying', async () => {
      const { host, settle } = await renderSection(section(working, pay));
      host.answers.set({
        working: { kind: 'yesNo', value: true },
        pay: { kind: 'money', value: '40000' },
      });
      await settle();
      expect(screen.getByRole('textbox', { name: 'What is your yearly pay?' })).toHaveProperty(
        'value',
        '40,000',
      );
      expect(screen.getByRole('radio', { name: 'Yes' })).toHaveProperty('checked', true);
      expect(last(host)).toBe(true);
    });

    it('does not rebuild the fields when the parent echoes its own answers back', async () => {
      const { host, user, settle } = await renderSection(section(email));
      const field = screen.getByRole('textbox', { name: 'What is your email?' });
      await user.type(field, 'a@b.test');
      await settle();
      host.answers.set({ ...host.answers() });
      await settle();
      expect(screen.getByRole('textbox', { name: 'What is your email?' })).toBe(field);
    });

    it('trims text answers', async () => {
      const { user, settle, host } = await renderSection(section(email));
      await user.type(screen.getByRole('textbox', { name: 'What is your email?' }), ' a@b.test ');
      await settle();
      expect(host.answers()['email']).toEqual({ kind: 'text', value: 'a@b.test' });
    });
  });

  describe('completion rules', () => {
    const optional = (q: Question): Question => ({ ...q, required: false });

    it('renders multiline text as a textarea', async () => {
      await renderSection(section(extra));
      expect(screen.getByRole('textbox', { name: 'Anything else?' }).tagName).toBe('TEXTAREA');
    });

    it.each([
      ['an unanswered confirmFacts', goal],
      ['a blank required money', pay],
      ['a blank required date', purchase],
    ])('is incomplete with %s', async (_, question) => {
      const { host, settle } = await renderSection(section(question));
      await settle();
      expect(last(host)).toBe(false);
    });

    it('is complete for No with an optional detail left blank', async () => {
      const q: Question = {
        ...working,
        detail: { when: false, label: 'What are you doing now?', required: false },
      };
      const { user, settle, host } = await renderSection(section(q));
      await user.click(screen.getByRole('radio', { name: 'No' }));
      await settle();
      expect(last(host)).toBe(true);
      expect(host.answers()['working']).toEqual({ kind: 'yesNo', value: false });
    });

    it('omits an optional whitespace-only answer and is complete', async () => {
      const { user, settle, host } = await renderSection(section(extra));
      await user.type(screen.getByRole('textbox', { name: 'Anything else?' }), '   ');
      await user.tab();
      await settle();
      expect(host.answers()).toEqual({});
      expect(last(host)).toBe(true);
    });

    it('is blocked by an invalid optional email', async () => {
      const { user, settle, host } = await renderSection(section(optional(email)));
      await user.type(screen.getByRole('textbox', { name: 'What is your email?' }), 'nope');
      await user.tab();
      await settle();
      expect(last(host)).toBe(false);
    });

    it('is complete for an optional radio option input left blank', async () => {
      const q: Question = {
        ...helper,
        options: [
          { value: 'a', label: 'Priya' },
          { value: 'b', label: 'Dev' },
          {
            value: 'c',
            label: 'A relative',
            input: { label: 'Who is that?', type: 'text', required: false },
          },
        ],
      };
      const { user, settle, host } = await renderSection(section(q));
      await user.click(screen.getByRole('radio', { name: 'A relative' }));
      await settle();
      expect(last(host)).toBe(true);
      expect(host.answers()['helper']).toEqual({ kind: 'radio', value: 'c' });
    });
  });

  describe('editing a confirmed FactCard', () => {
    it('takes the card out of complete while editing, and Cancel restores it', async () => {
      const { user, settle, host } = await renderSection(section(goal));
      await user.click(screen.getByRole('button', { name: 'Confirm' }));
      await settle();
      expect(last(host)).toBe(true);
      await user.click(screen.getByRole('button', { name: 'Make a change' }));
      await settle();
      expect(last(host)).toBe(false);
      expect(host.answers()).toEqual({});
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      await settle();
      expect(last(host)).toBe(true);
      expect(host.answers()['goal']).toEqual({ kind: 'confirmFacts', changed: [] });
    });

    it('is complete again once the change is saved', async () => {
      const { user, settle, host } = await renderSection(section(goal));
      await user.click(screen.getByRole('button', { name: 'Confirm' }));
      await user.click(screen.getByRole('button', { name: 'Make a change' }));
      const fact = screen.getByRole('textbox', { name: 'Retire at 60' });
      await user.type(fact, ' or 62');
      await user.click(screen.getByRole('button', { name: 'Save' }));
      await settle();
      expect(last(host)).toBe(true);
      expect(host.answers()['goal']).toMatchObject({ kind: 'confirmFacts' });
    });
  });
});
