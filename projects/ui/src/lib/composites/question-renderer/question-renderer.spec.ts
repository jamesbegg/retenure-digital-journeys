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

    it('counts a text answer only on blur', async () => {
      const { user, settle } = await renderSection(section(email, pay));
      await user.type(screen.getByRole('textbox', { name: 'What is your email?' }), 'a@b.test');
      await settle();
      expect(screen.queryByText('What is your yearly pay?')).toBeNull();
      await user.tab();
      await settle();
      screen.getByRole('textbox', { name: 'What is your yearly pay?' });
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

    it('falls back to the required message for unreadable money with no configured text', async () => {
      const { user, settle } = await renderSection(section({ ...pay, validators: undefined }));
      await user.type(screen.getByRole('textbox', { name: 'What is your yearly pay?' }), 'lots');
      await user.tab();
      await settle();
      screen.getByText('Answer this question to continue');
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
  });
});
