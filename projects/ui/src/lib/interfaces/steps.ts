export type StepState = 'done' | 'current' | 'todo';

export interface StepItem {
  label: string;
  meta?: string;
  state: StepState;
}
