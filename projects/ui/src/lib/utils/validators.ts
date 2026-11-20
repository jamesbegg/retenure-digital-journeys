import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { DateOfBirthError, MoneyAmountError } from '../interfaces/validators';

// Light-touch checks that catch slips (a name in the email field, 1196 for 1996).
// Empty values pass: Validators.required decides whether an answer is needed.

const text = (control: AbstractControl): string => String(control.value ?? '').trim();

export const emailAddress: ValidatorFn = (control) =>
  !text(control) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(control))
    ? null
    : { emailAddress: true };

export const ukPhone: ValidatorFn = (control) => {
  const digits = text(control).replace(/[\s()-]/g, '');
  return !digits || /^(\+44|0)\d{9,10}$/.test(digits) ? null : { ukPhone: true };
};

export const personName: ValidatorFn = (control) => {
  const name = text(control);
  return !name || (/\p{L}/u.test(name) && !/[@\d]/.test(name) && name.length <= 100)
    ? null
    : { personName: true };
};

export function dateOfBirth(minAge = 18, maxAge = 110): ValidatorFn {
  return (control): ValidationErrors | null => {
    const iso = text(control);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
    const [year, month, day] = iso.split('-').map(Number);
    const today = new Date();
    const age =
      today.getFullYear() -
      year -
      (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)
        ? 1
        : 0);
    const reason =
      new Date(year, month - 1, day) > today
        ? 'future'
        : age < minAge
          ? 'tooYoung'
          : age > maxAge
            ? 'tooOld'
            : null;
    return reason ? ({ dateOfBirth: { reason, age } } satisfies DateOfBirthError) : null;
  };
}

export function moneyAmount(min = 0, max = Number.POSITIVE_INFINITY): ValidatorFn {
  return (control): ValidationErrors | null => {
    const value = text(control);
    if (!value) return null;
    const amount = /^\d+(\.\d{1,2})?$/.test(value) ? Number(value) : NaN;
    const reason = isNaN(amount)
      ? 'unreadable'
      : amount < min
        ? 'tooLow'
        : amount > max
          ? 'tooHigh'
          : null;
    return reason ? ({ moneyAmount: { reason } } satisfies MoneyAmountError) : null;
  };
}
