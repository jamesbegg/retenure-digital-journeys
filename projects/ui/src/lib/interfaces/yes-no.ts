export type YesNoVariant = 'standalone' | 'embedded';

export interface YesNoDetailField {
  when: boolean;
  label: string;
}

export interface YesNoValue {
  value: boolean;
  detail?: string;
}
