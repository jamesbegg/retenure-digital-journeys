import {
  AnswerValue,
  HeldFact,
  JourneyCopy,
  RenderableQuestion,
  RenderableSection,
  SectionAnswers,
} from '@retenure/ui';

const longDate = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' });
const pounds = (amount: string) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: amount.includes('.') ? 2 : 0,
  }).format(Number(amount));

// A section's answers as rows for Check your answers: the question as asked, the answer as given.
export function summariseAnswers(
  section: RenderableSection,
  answers: SectionAnswers,
  copy: JourneyCopy,
): HeldFact[] {
  return section.blocks.flatMap(({ question }) => {
    const answer = answers[question.id];
    const value = answer && describe(question, answer, copy);
    return value ? [{ id: question.id, label: question.prompt, value }] : [];
  });
}

function describe(
  question: RenderableQuestion,
  answer: AnswerValue,
  copy: JourneyCopy,
): string | undefined {
  switch (answer.kind) {
    case 'yesNo': {
      const yesLabel = question.kind === 'yesNo' ? question.yesLabel : undefined;
      const noLabel = question.kind === 'yesNo' ? question.noLabel : undefined;
      const label = answer.value ? (yesLabel ?? 'Yes') : (noLabel ?? 'No');
      return withDetail(label, answer.detail);
    }
    case 'radio': {
      const option =
        question.kind === 'radio' && question.options.find((o) => o.value === answer.value);
      const detail =
        answer.input && option && option.input?.type === 'money'
          ? pounds(answer.input)
          : answer.input;
      return withDetail(option ? option.label : answer.value, detail);
    }
    case 'text':
      return answer.value;
    case 'money':
      return pounds(answer.value);
    case 'date':
      return longDate.format(new Date(`${answer.value}T00:00:00Z`));
    case 'confirmFacts': {
      const facts = question.kind === 'confirmFacts' ? question.facts : [];
      const changes = answer.changed.map(
        ({ factId, newValue }) =>
          `${facts.find((fact) => fact.id === factId)?.label ?? factId}: ${newValue}`,
      );
      const summary = changes.length ? changes.join('. ') : copy.stillRight;
      return withDetail(summary, answer.note);
    }
    default:
      // checkbox and goals are not shown in v1, so there is nothing to summarise.
      return undefined;
  }
}

const withDetail = (text: string, detail?: string) => (detail ? `${text}. ${detail}` : text);
