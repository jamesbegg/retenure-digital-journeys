export type TextFieldType = 'text' | 'multiline' | 'money' | 'date' | 'email' | 'tel';
export type TextFieldSize = 'md' | 'lg';
export type DatePart = 'day' | 'month' | 'year';
export type DateParts = Record<DatePart, string>;

export interface IncompleteDateError {
  incompleteDate: { missing: DatePart[] };
}

export interface InvalidDateError {
  invalidDate: true;
}
