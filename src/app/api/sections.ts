import {
  ageLimits,
  Block,
  HeldFact,
  Question,
  QuestionOption,
  Section,
  ValidatorRef,
  YesNoDetail,
} from '@retenure/ui';
import { Reader, unique } from './reader';

// v1 renders these kinds and only card blocks, with no follow-ups. Anything else fails closed.
const v1Kinds = ['yesNo', 'radio', 'text', 'money', 'date', 'confirmFacts'] as const;

const textRules = ['emailAddress', 'ukPhone', 'personName'] as const;
const rulesFor = {
  yesNo: [],
  radio: [],
  text: textRules,
  multiline: textRules,
  money: ['moneyAmount'],
  date: ['dateOfBirth'],
  confirmFacts: [],
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
      const minAge = reader.optionalInteger('minAge');
      const maxAge = reader.optionalInteger('maxAge');
      if ((maxAge ?? ageLimits.max) < (minAge ?? ageLimits.min))
        reader.fail('maxAge', 'below minAge');
      return {
        rule,
        minAge,
        maxAge,
        messages: {
          future: messages.string('future'),
          tooYoung: messages.string('tooYoung'),
          tooOld: messages.string('tooOld'),
        },
      };
    }
    case 'moneyAmount': {
      const messages = reader.object('messages');
      const min = reader.optionalNumber('min');
      const max = reader.optionalNumber('max');
      if ((max ?? Infinity) < (min ?? 0)) reader.fail('max', 'below min');
      return {
        rule,
        min,
        max,
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

function yesNoDetail(reader: Reader): YesNoDetail {
  return {
    when: reader.boolean('when'),
    label: reader.string('label'),
    required: reader.boolean('required'),
  };
}

function heldFact(reader: Reader, memberIds: ReadonlySet<string>): HeldFact {
  const personId = reader.optionalString('personId');
  if (personId !== undefined && !memberIds.has(personId)) {
    reader.fail('personId', 'not a household member');
  }
  return {
    id: reader.string('id'),
    label: reader.string('label'),
    value: reader.string('value'),
    ...(personId !== undefined && { personId }),
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
        ...(reader.has('detail') && { detail: yesNoDetail(reader.object('detail')) }),
      };
    case 'radio': {
      const options = reader.objects('options', option, 3);
      if (options.length > 6) reader.fail('options', 'expected at most 6');
      if (options.filter((o) => o.input).length > 1) {
        reader.fail('options', 'at most one option may have an input');
      }
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
    case 'money':
      return { ...base, kind };
    case 'confirmFacts': {
      if (!base.required) reader.fail('required', 'must be true');
      const facts = reader.objects('facts', (fact) => heldFact(fact, memberIds), 1);
      if (facts.length > 8) reader.fail('facts', 'expected at most 8');
      unique(
        facts.map((f) => f.id),
        `${reader.path}.facts`,
      );
      return { ...base, kind, facts };
    }
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
