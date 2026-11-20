export type AnswerValue =
  | { kind: 'yesNo'; value: boolean }
  | { kind: 'radio'; value: string; input?: string }
  | { kind: 'checkbox'; values: string[]; inputs?: Record<string, string> }
  | { kind: 'text' | 'email' | 'tel'; value: string }
  | { kind: 'money'; value: string }
  | { kind: 'date'; value: string }
  | { kind: 'confirmFacts'; changed: { factId: string; newValue: string }[] }
  | { kind: 'goals'; changes?: string };
