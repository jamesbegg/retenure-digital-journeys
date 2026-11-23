import { ValidatorRef } from './validators';

export interface Person {
  id: string;
  firstName: string;
  role: 'lead' | 'partner' | 'dependant';
}

export interface HeldFact {
  id: string;
  label: string;
  value: string;
  personId?: string;
}

export interface QuestionOption {
  value: string;
  label: string;
  hint?: string;
  input?: {
    label: string;
    type: 'text' | 'money' | 'multiline';
    required: boolean;
    validators?: ValidatorRef[];
  };
}

export interface YesNoDetail {
  when: boolean;
  label: string;
  required: boolean;
}

export type AnswerMatch = { equals: boolean | string } | { oneOf: string[] };

export interface FollowUp {
  when: AnswerMatch;
  questions: Question[];
}

export interface QuestionBase {
  id: string;
  version: number;
  personId?: string;
  prompt: string;
  hint?: string;
  required: boolean;
  validators?: ValidatorRef[];
  followUps?: FollowUp[];
}

export type Question =
  | (QuestionBase & { kind: 'yesNo'; yesLabel?: string; noLabel?: string; detail?: YesNoDetail })
  | (QuestionBase & { kind: 'radio'; options: QuestionOption[] })
  | (QuestionBase & { kind: 'checkbox'; options: QuestionOption[] })
  | (QuestionBase & { kind: 'text'; multiline: boolean; autocomplete?: string })
  | (QuestionBase & { kind: 'money' })
  | (QuestionBase & { kind: 'date'; autocomplete?: 'bday' })
  | (QuestionBase & { kind: 'confirmFacts'; facts: HeldFact[] })
  | (QuestionBase & { kind: 'goals'; goals: string[] });

export type Block =
  | { type: 'card'; question: Question }
  | { type: 'notice'; tone: 'info' | 'warning'; text: string }
  | { type: 'facts'; title: string; facts: HeldFact[] };

export interface Section {
  id: string;
  title: string;
  intro?: string;
  blocks: Block[];
}
