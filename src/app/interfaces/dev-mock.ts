export type MockScenario =
  | 'happy'
  | 'wrongDob'
  | 'locked'
  | 'linkReissued'
  | 'alreadyCompleted'
  | 'expired'
  | 'sessionExpired'
  | 'lostSubmit';

export type MockFirm = 'hartwell' | 'northgate';

export interface MockVerificationBody {
  dateOfBirth: string;
}
