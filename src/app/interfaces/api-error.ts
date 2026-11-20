export type ClientErrorReason =
  | 'unknown_host'
  | 'journey_mismatch'
  | 'session_expired'
  | 'already_submitted'
  | 'submission_mismatch'
  | 'invalid_submission'
  | 'unsupported_plan'
  | 'verification_failed'
  | 'verification_locked'
  | 'link_reissued'
  | 'link_requested'
  | 'forbidden_origin';

export interface FieldError {
  field: string;
  code: string;
  message: string;
}

export interface ApiError {
  error: string;
  statusCode: number;
  message: string;
  requestId: string;
  fieldErrors?: FieldError[];
  reason?: ClientErrorReason;
}
