import { AnswerValue, RenderableSection } from '@retenure/ui';
import { copy } from '../../api/fixtures';
import { summariseAnswers } from './summarise-answers';

const section: RenderableSection = {
  id: 's1',
  title: 'Everything',
  blocks: [
    {
      type: 'card',
      question: { id: 'yn', version: 1, kind: 'yesNo', prompt: 'Moved home?', required: true },
    },
    {
      type: 'card',
      question: {
        id: 'yn2',
        version: 1,
        kind: 'yesNo',
        prompt: 'Still renting?',
        required: true,
        yesLabel: 'Yes, still renting',
        noLabel: 'No, we bought',
      },
    },
    {
      type: 'card',
      question: {
        id: 'rd',
        version: 1,
        kind: 'radio',
        prompt: 'Spending?',
        required: true,
        options: [
          {
            value: 'more',
            label: 'More',
            input: { label: 'How much?', type: 'money', required: true },
          },
          { value: 'same', label: 'About the same' },
        ],
      },
    },
    {
      type: 'card',
      question: {
        id: 'tx',
        version: 1,
        kind: 'text',
        multiline: false,
        prompt: 'Anything else?',
        required: false,
      },
    },
    {
      type: 'card',
      question: { id: 'mn', version: 1, kind: 'money', prompt: 'Savings?', required: true },
    },
    {
      type: 'card',
      question: { id: 'dt', version: 1, kind: 'date', prompt: 'Date of birth?', required: true },
    },
    {
      type: 'card',
      question: {
        id: 'cf',
        version: 1,
        kind: 'confirmFacts',
        prompt: 'Is this right?',
        required: true,
        facts: [
          { id: 'f1', label: 'Job', value: 'Nurse' },
          { id: 'f2', label: 'Salary', value: '£40,000' },
        ],
      },
    },
  ],
};

const answers: Record<string, AnswerValue> = {
  yn: { kind: 'yesNo', value: false },
  yn2: { kind: 'yesNo', value: true, detail: 'Since May' },
  rd: { kind: 'radio', value: 'more', input: '250.5' },
  tx: { kind: 'text', value: 'We may move.' },
  mn: { kind: 'money', value: '12000' },
  dt: { kind: 'date', value: '1983-04-17' },
  cf: { kind: 'confirmFacts', changed: [{ factId: 'f2', newValue: '£42,000' }], note: 'Pay rise' },
};

const rows = (given: Record<string, AnswerValue> = answers) =>
  Object.fromEntries(
    summariseAnswers(section, given, copy).map(({ id, label, value }) => [id, [label, value]]),
  );

describe('summariseAnswers', () => {
  it('words each answer the way the client gave it, under the question as asked', () => {
    expect(rows()).toEqual({
      yn: ['Moved home?', 'No'],
      yn2: ['Still renting?', 'Yes, still renting. Since May'],
      rd: ['Spending?', 'More. £250.50'],
      tx: ['Anything else?', 'We may move.'],
      mn: ['Savings?', '£12,000'],
      dt: ['Date of birth?', '17 April 1983'],
      cf: ['Is this right?', 'Salary: £42,000. Pay rise'],
    });
  });

  it('says "Still right" for held facts that were confirmed as they are', () => {
    expect(rows({ cf: { kind: 'confirmFacts', changed: [] } })['cf']).toEqual([
      'Is this right?',
      copy.stillRight,
    ]);
  });

  it('leaves out a question that has no answer, in the order asked', () => {
    expect(Object.keys(rows({ mn: answers['mn'], yn: answers['yn'] }))).toEqual(['yn', 'mn']);
  });

  it('shows pence only when the amount has them', () => {
    expect(rows({ mn: { kind: 'money', value: '250.5' } })['mn'][1]).toBe('£250.50');
  });
});
