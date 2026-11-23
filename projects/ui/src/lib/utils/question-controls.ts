import { FormControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { AnswerValue, FactCardValue } from '../interfaces/answer';
import { JourneyCopy } from '../interfaces/journey-copy';
import { Question } from '../interfaces/question';
import {
  OptionInputError,
  QuestionControlValue,
  QuestionError,
  QuestionItem,
  RenderedQuestion,
} from '../interfaces/question-renderer';
import { RadioGroupValue } from '../interfaces/radio-group';
import { TextFieldType } from '../interfaces/text-field';
import { DateOfBirthError, MoneyAmountError, ValidatorRef } from '../interfaces/validators';
import { YesNoValue } from '../interfaces/yes-no';
import { dateOfBirth, emailAddress, moneyAmount, personName, ukPhone } from './validators';

const RENDERED = ['yesNo', 'radio', 'text', 'money', 'date', 'confirmFacts'];

export const isRendered = (question: Question): question is RenderedQuestion =>
  RENDERED.includes(question.kind);

const blank = (value: QuestionControlValue): boolean =>
  value === null || (typeof value === 'string' && !value.trim());

const all =
  (...fns: ValidatorFn[]): ValidatorFn =>
  (control) => {
    const errors = Object.assign({}, ...fns.map((fn) => fn(control)));
    return Object.keys(errors).length ? errors : null;
  };

function refValidator(ref: ValidatorRef): ValidatorFn {
  switch (ref.rule) {
    case 'emailAddress':
      return emailAddress;
    case 'ukPhone':
      return ukPhone;
    case 'personName':
      return personName;
    case 'dateOfBirth':
      return dateOfBirth(ref.minAge, ref.maxAge);
    case 'moneyAmount':
      return moneyAmount(ref.min, ref.max);
  }
}

// Money always reports unreadable text, with or without a configured limit.
function fieldValidators(type: TextFieldType, refs: ValidatorRef[] = []): ValidatorFn[] {
  const fns = refs.map(refValidator);
  return type === 'money' && !refs.some((ref) => ref.rule === 'moneyAmount')
    ? [...fns, moneyAmount()]
    : fns;
}

function validatorFor(q: RenderedQuestion): ValidatorFn {
  const required: ValidatorFn = (control) =>
    q.required && blank(control.value) ? { required: true } : null;
  switch (q.kind) {
    case 'yesNo':
      return all(required, (control) => {
        const value: YesNoValue | null = control.value;
        return q.detail?.required && value?.value === q.detail.when && !value.detail?.trim()
          ? { detailRequired: true }
          : null;
      });
    case 'radio':
      return all(required, (control) => {
        const value: RadioGroupValue | null = control.value;
        const input = q.options.find((o) => o.value === value?.value)?.input;
        const text = value?.input ?? '';
        if (!value || !input) return null;
        const errors = text.trim()
          ? all(...fieldValidators(input.type, input.validators))(new FormControl(text))
          : input.required
            ? { required: true }
            : null;
        return errors ? { optionInput: { option: value.value, errors } } : null;
      });
    case 'text':
      return all(required, ...fieldValidators(q.multiline ? 'multiline' : 'text', q.validators));
    case 'money':
    case 'date':
      return all(required, ...fieldValidators(q.kind, q.validators));
    case 'confirmFacts':
      return required;
  }
}

const emptyValue = (q: RenderedQuestion): QuestionControlValue =>
  q.kind === 'text' || q.kind === 'money' || q.kind === 'date' ? '' : null;

function controlValue(q: RenderedQuestion, answer?: AnswerValue): QuestionControlValue {
  if (!answer || answer.kind !== q.kind) return emptyValue(q);
  switch (answer.kind) {
    case 'yesNo':
      return answer.detail === undefined
        ? { value: answer.value }
        : { value: answer.value, detail: answer.detail };
    case 'radio':
      return answer.input === undefined
        ? { value: answer.value }
        : { value: answer.value, input: answer.input };
    case 'text':
    case 'money':
    case 'date':
      return answer.value;
    case 'confirmFacts':
      return answer.note === undefined
        ? { changed: answer.changed }
        : { changed: answer.changed, note: answer.note };
    default:
      return emptyValue(q);
  }
}

export function buildItem(question: RenderedQuestion, answer?: AnswerValue): QuestionItem {
  const value = controlValue(question, answer);
  const control = new FormControl<QuestionControlValue>(value, {
    validators: validatorFor(question),
  });
  if (!blank(value)) control.markAsTouched();
  return { question, control };
}

// A question counts as answered once it is valid: non-blank when required, so the next card
// exists before the client tabs on. Errors are the renderer's business, shown on blur.
export const isAnswered = ({ control }: QuestionItem): boolean => control.valid;

export function toAnswer({ question: q, control }: QuestionItem): AnswerValue | undefined {
  const value = control.value;
  if (control.invalid || blank(value)) return undefined;
  switch (q.kind) {
    case 'yesNo': {
      const { value: yes, detail } = value as YesNoValue;
      return detail?.trim()
        ? { kind: q.kind, value: yes, detail: detail.trim() }
        : { kind: q.kind, value: yes };
    }
    case 'radio': {
      const { value: option, input } = value as RadioGroupValue;
      return input?.trim()
        ? { kind: q.kind, value: option, input: input.trim() }
        : { kind: q.kind, value: option };
    }
    case 'text':
    case 'money':
    case 'date':
      return { kind: q.kind, value: (value as string).trim() };
    case 'confirmFacts': {
      const { changed, note } = value as NonNullable<FactCardValue>;
      return note === undefined ? { kind: q.kind, changed } : { kind: q.kind, changed, note };
    }
  }
}

export function errorMessage(
  errors: ValidationErrors,
  copy: JourneyCopy,
  refs: ValidatorRef[] = [],
): string {
  if (errors['incompleteDate']) return copy.incompleteDate;
  if (errors['invalidDate']) return copy.invalidDate;
  for (const ref of refs) {
    const found: unknown = errors[ref.rule];
    if (!found) continue;
    switch (ref.rule) {
      case 'dateOfBirth':
        return ref.messages[(found as DateOfBirthError['dateOfBirth']).reason];
      case 'moneyAmount':
        return ref.messages[(found as MoneyAmountError['moneyAmount']).reason];
      default:
        return ref.message;
    }
  }
  return errors['moneyAmount'] ? copy.moneyUnreadable : copy.required;
}

export function questionError(
  { question: q, control }: QuestionItem,
  copy: JourneyCopy,
): QuestionError {
  const errors = control.errors;
  if (!errors) return {};
  if (errors['detailRequired']) return { detailError: copy.required };
  const option: OptionInputError | undefined = errors['optionInput'];
  if (option) {
    const refs =
      q.kind === 'radio' ? q.options.find((o) => o.value === option.option)?.input?.validators : [];
    return { optionErrors: { [option.option]: errorMessage(option.errors, copy, refs) } };
  }
  return { error: errorMessage(errors, copy, q.validators) };
}
