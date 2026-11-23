import { FormControl, ValidationErrors } from '@angular/forms';
import { FactCardValue, SectionAnswers } from './answer';
import { Question, Section } from './question';
import { RadioGroupValue } from './radio-group';
import { YesNoValue } from './yes-no';

export type RenderedQuestion = Extract<
  Question,
  { kind: 'yesNo' | 'radio' | 'text' | 'money' | 'date' | 'confirmFacts' }
>;

export type QuestionControlValue = YesNoValue | RadioGroupValue | FactCardValue | string | null;

export interface QuestionItem {
  question: RenderedQuestion;
  control: FormControl<QuestionControlValue>;
}

export interface RendererSource {
  section: Section;
  answers: SectionAnswers;
}

export interface ShownQuestions {
  items: QuestionItem[];
  count: number;
}

export interface OptionInputError {
  option: string;
  errors: ValidationErrors;
}

export interface QuestionError {
  error?: string;
  detailError?: string;
  optionErrors?: Record<string, string>;
}
