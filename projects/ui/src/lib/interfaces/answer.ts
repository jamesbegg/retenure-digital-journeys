export type AnswerValue =
  | { kind: 'yesNo'; value: boolean; detail?: string }
  | { kind: 'radio'; value: string; input?: string }
  | { kind: 'checkbox'; values: string[]; inputs?: Record<string, string> }
  | { kind: 'text'; value: string }
  | { kind: 'money'; value: string }
  | { kind: 'date'; value: string }
  | { kind: 'confirmFacts'; changed: { factId: string; newValue: string }[]; note?: string }
  | { kind: 'goals'; changes?: string };

export type SectionAnswers = Record<string, AnswerValue>;

export type FactCardValue = {
  changed: { factId: string; newValue: string }[];
  note?: string;
} | null;
