import { TextFieldType } from './text-field';

export type RadioGroupSize = 'md' | 'lg';
export type RadioOptionInputType = Extract<TextFieldType, 'text' | 'money' | 'multiline'>;

export interface RadioOptionInput {
  label: string;
  type: RadioOptionInputType;
}

export interface RadioOption {
  value: string;
  label: string;
  hint?: string;
  input?: RadioOptionInput;
}

export interface RadioGroupValue {
  value: string;
  input?: string;
}
