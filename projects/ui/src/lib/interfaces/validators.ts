export interface DateOfBirthError {
  dateOfBirth: { reason: 'future' | 'tooYoung' | 'tooOld'; age: number };
}

export interface MoneyAmountError {
  moneyAmount: { reason: 'unreadable' | 'tooLow' | 'tooHigh' };
}

export type ValidatorRef =
  | { rule: 'emailAddress'; message: string }
  | { rule: 'ukPhone'; message: string }
  | { rule: 'personName'; message: string }
  | {
      rule: 'dateOfBirth';
      minAge?: number;
      maxAge?: number;
      messages: { future: string; tooYoung: string; tooOld: string };
    }
  | {
      rule: 'moneyAmount';
      min?: number;
      max?: number;
      messages: { unreadable: string; tooLow: string; tooHigh: string };
    };
