import { FormControl, ValidatorFn } from '@angular/forms';
import { dateOfBirth, emailAddress, moneyAmount, personName, ukPhone } from './validators';

const errors = (validator: ValidatorFn, value: string | null) => validator(new FormControl(value));

describe('validators', () => {
  it('leave empty answers to Validators.required', () => {
    for (const v of [emailAddress, ukPhone, personName, dateOfBirth(), moneyAmount()]) {
      expect(errors(v, '')).toBeNull();
      expect(errors(v, null)).toBeNull();
    }
  });

  it('emailAddress catches a name typed into the email field', () => {
    expect(errors(emailAddress, 'Priya Shah')).toEqual({ emailAddress: true });
    expect(errors(emailAddress, 'priya@hartwell')).toEqual({ emailAddress: true });
    expect(errors(emailAddress, 'priya.shah@hartwell.example')).toBeNull();
    expect(errors(emailAddress, ' priya@example.co.uk ')).toBeNull();
  });

  it('ukPhone accepts common UK formats and rejects stray text', () => {
    for (const ok of ['07700 900123', '+44 7700 900123', '(020) 7946 0018', '0117-496-0123']) {
      expect(errors(ukPhone, ok)).toBeNull();
    }
    for (const bad of ['07700', 'Priya', '7700900123', '+1 555 0100']) {
      expect(errors(ukPhone, bad)).toEqual({ ukPhone: true });
    }
  });

  it('personName allows real names and catches an email or number', () => {
    for (const ok of ["Siân O'Neill-Brown", 'Zoë', 'Priya Shah']) {
      expect(errors(personName, ok)).toBeNull();
    }
    for (const bad of ['priya@example.com', '07700900123', '---', 'a'.repeat(101)]) {
      expect(errors(personName, bad)).toEqual({ personName: true });
    }
  });

  describe('dateOfBirth', () => {
    beforeEach(() => vi.useFakeTimers({ now: new Date(2026, 10, 20) }));
    afterEach(() => vi.useRealTimers());

    it('catches 1196 typed for 1996', () => {
      expect(errors(dateOfBirth(), '1196-05-04')).toEqual({
        dateOfBirth: { reason: 'tooOld', age: 830 },
      });
      expect(errors(dateOfBirth(), '1996-05-04')).toBeNull();
    });

    it('catches a future date and an age outside the range, counting birthdays exactly', () => {
      expect(errors(dateOfBirth(), '2027-01-01')).toEqual({
        dateOfBirth: { reason: 'future', age: -1 },
      });
      expect(errors(dateOfBirth(), '2008-11-21')).toEqual({
        dateOfBirth: { reason: 'tooYoung', age: 17 },
      });
      expect(errors(dateOfBirth(), '2008-11-20')).toBeNull();
      expect(errors(dateOfBirth(18, 60), '1960-01-01')).toEqual({
        dateOfBirth: { reason: 'tooOld', age: 66 },
      });
    });

    it('leaves an incomplete date to the TextField date validator', () => {
      expect(errors(dateOfBirth(), '1996-05')).toBeNull();
    });
  });

  it('moneyAmount catches unreadable text and amounts out of range', () => {
    expect(errors(moneyAmount(), 'about 3k')).toEqual({ moneyAmount: { reason: 'unreadable' } });
    expect(errors(moneyAmount(), '12.345')).toEqual({ moneyAmount: { reason: 'unreadable' } });
    expect(errors(moneyAmount(1), '0')).toEqual({ moneyAmount: { reason: 'tooLow' } });
    expect(errors(moneyAmount(0, 100000), '250000')).toEqual({
      moneyAmount: { reason: 'tooHigh' },
    });
    expect(errors(moneyAmount(0, 100000), '3000.50')).toBeNull();
  });
});
