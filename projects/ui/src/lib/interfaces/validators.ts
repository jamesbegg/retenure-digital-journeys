export interface DateOfBirthError {
  dateOfBirth: { reason: 'future' | 'tooYoung' | 'tooOld'; age: number };
}

export interface MoneyAmountError {
  moneyAmount: { reason: 'unreadable' | 'tooLow' | 'tooHigh' };
}
