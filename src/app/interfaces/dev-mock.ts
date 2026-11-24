export type MockScenario =
  | 'happy'
  | 'wrongDob'
  | 'locked'
  | 'linkReissued'
  | 'linkRequested'
  | 'alreadyCompleted'
  | 'expired'
  | 'sessionExpired'
  | 'lostSubmit'
  | 'serverError';

export type MockFirm = 'hartwell' | 'northgate';

export interface MockVerificationBody {
  dateOfBirth: string;
}
