import { FormControl, ValidationErrors } from '@angular/forms';
import { FactCardValue, SectionAnswers } from './answer';
import { Question, Section } from './question';
import { RadioGroupValue } from './radio-group';
import { YesNoValue } from './yes-no';

export type RenderableQuestion = Extract<
  Question,
  { kind: 'yesNo' | 'radio' | 'text' | 'money' | 'date' | 'confirmFacts' }
>;

export interface RenderableBlock {
  type: 'card';
  question: RenderableQuestion;
}

export interface RenderableSection extends Omit<Section, 'blocks'> {
  blocks: RenderableBlock[];
}

export type QuestionControlValue = YesNoValue | RadioGroupValue | FactCardValue | string | null;

export interface QuestionItem {
  question: RenderableQuestion;
  control: FormControl<QuestionControlValue>;
}

export interface RendererSource {
  section: RenderableSection;
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
