import { ApiError, ClientErrorReason } from './api-error';

export type JourneyStage =
  | 'link-problem'
  | 'verify'
  | 'loading'
  | 'ready'
  | 'done'
  | 'already-completed'
  | 'expired'
  | 'locked'
  | 'link-reissued'
  | 'link-requested'
  | 'error';

// 'network': the send may or may not have landed, so retry with the same submissionId.
// 'invalid': the backend refused the batch, and fieldErrors says where.
export type SubmitProblem = 'network' | 'invalid';

export interface FailureInfo {
  status: number;
  apiError: ApiError | null;
  reason?: ClientErrorReason;
}
