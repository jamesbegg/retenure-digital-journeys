export type ClientHeaderLayout = 'mobile' | 'desktop';

export interface ClientHeaderProgress {
  label: string;
  step: number;
  total: number;
  meta?: string;
}
