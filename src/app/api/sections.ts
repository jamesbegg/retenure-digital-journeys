import { Block, Question, QuestionOption, Section, ValidatorRef } from '@retenure/ui';
import { Reader, unique } from './reader';

// v1 renders these kinds and only card blocks, with no follow-ups. Anything else fails closed.
const v1Kinds = ['yesNo', 'radio', 'text', 'email', 'tel', 'money', 'date'] as const;

const textRules = ['emailAddress', 'ukPhone', 'personName'] as const;
const rulesFor = {
  yesNo: [],
  radio: [],
  text: textRules,
  multiline: textRules,
  email: ['emailAddress'],
  tel: ['ukPhone'],
  money: ['moneyAmount'],
  date: ['dateOfBirth'],
} as const satisfies Record<string, readonly ValidatorRef['rule'][]>;

function validator(reader: Reader, allowed: readonly ValidatorRef['rule'][]): ValidatorRef {
  const rule = reader.oneOf('rule', allowed);
  switch (rule) {
    case 'emailAddress':
    case 'ukPhone':
    case 'personName':
      return { rule, message: reader.string('message') };
    case 'dateOfBirth': {
      const messages = reader.object('messages');
      return {
        rule,
        minAge: reader.optionalInteger('minAge'),
        maxAge: reader.optionalInteger('maxAge'),
        messages: {
          future: messages.string('future'),
          tooYoung: messages.string('tooYoung'),
          tooOld: messages.string('tooOld'),
        },
      };
    }
    case 'moneyAmount': {
      const messages = reader.object('messages');
      return {
        rule,
        min: reader.optionalNumber('min'),
        max: reader.optionalNumber('max'),
        messages: {
          unreadable: messages.string('unreadable'),
          tooLow: messages.string('tooLow'),
          tooHigh: messages.string('tooHigh'),
        },
      };
    }
  }
}

function validators(reader: Reader, kind: keyof typeof rulesFor): ValidatorRef[] | undefined {
  return reader.optionalObjects('validators', (item) => validator(item, rulesFor[kind]));
}

function option(reader: Reader): QuestionOption {
  const input = reader.has('input') ? reader.object('input') : undefined;
  const inputType = input?.oneOf('type', ['text', 'money', 'multiline'] as const);
  return {
    value: reader.string('value'),
    label: reader.string('label'),
    hint: reader.optionalString('hint'),
    ...(input &&
      inputType && {
        input: {
          label: input.string('label'),
          type: inputType,
          required: input.boolean('required'),
          validators: validators(input, inputType),
        },
      }),
  };
}

function question(reader: Reader, memberIds: ReadonlySet<string>): Question {
  if (reader.has('followUps')) reader.fail('followUps', 'not supported in v1');
  const personId = reader.optionalString('personId');
  if (personId !== undefined && !memberIds.has(personId)) {
    reader.fail('personId', 'not a household member');
  }
  const kind = reader.oneOf('kind', v1Kinds);
  const base = {
    id: reader.string('id'),
    version: reader.integer('version', 1),
    personId,
    prompt: reader.string('prompt'),
    hint: reader.optionalString('hint'),
    required: reader.boolean('required'),
    validators: validators(reader, kind),
  };
  switch (kind) {
    case 'yesNo':
      return {
        ...base,
        kind,
        yesLabel: reader.optionalString('yesLabel'),
        noLabel: reader.optionalString('noLabel'),
      };
    case 'radio': {
      const options = reader.objects('options', option, 2);
      unique(
        options.map((o) => o.value),
        `${reader.path}.options`,
      );
      return { ...base, kind, options };
    }
    case 'text':
      return {
        ...base,
        kind,
        multiline: reader.boolean('multiline'),
        autocomplete: reader.optionalString('autocomplete'),
      };
    case 'email':
    case 'tel':
      return {
        ...base,
        kind,
        autocomplete: reader.has('autocomplete') ? reader.oneOf('autocomplete', [kind]) : undefined,
      };
    case 'money':
      return { ...base, kind };
    case 'date':
      return {
        ...base,
        kind,
        autocomplete: reader.has('autocomplete')
          ? reader.oneOf('autocomplete', ['bday'] as const)
          : undefined,
      };
  }
}

function block(reader: Reader, memberIds: ReadonlySet<string>): Block {
  reader.oneOf('type', ['card']);
  return { type: 'card', question: question(reader.object('question'), memberIds) };
}

export function parseSections(reader: Reader, memberIds: ReadonlySet<string>): Section[] {
  const sections = reader.objects(
    'sections',
    (section) => ({
      id: section.string('id'),
      title: section.string('title'),
      intro: section.optionalString('intro'),
      blocks: section.objects('blocks', (item) => block(item, memberIds), 1),
    }),
    1,
  );
  unique(
    sections.map((s) => s.id),
    `${reader.path}.sections`,
  );
  unique(
    sections.flatMap((s) => s.blocks.map((b) => (b.type === 'card' ? b.question.id : ''))),
    `${reader.path}.questions`,
  );
  return sections;
}
