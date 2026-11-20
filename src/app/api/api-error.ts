import { ApiError, ClientErrorReason } from '../interfaces/api-error';
import { Reader } from './reader';

const reasons: readonly ClientErrorReason[] = [
  'unknown_host',
  'journey_mismatch',
  'session_expired',
  'already_submitted',
  'submission_mismatch',
  'invalid_submission',
  'unsupported_plan',
  'verification_failed',
  'verification_locked',
  'link_reissued',
  'link_requested',
  'forbidden_origin',
];

// An unrecognised reason is dropped so the caller falls back to the status code.
export function parseApiError(json: unknown): ApiError {
  const body = Reader.from(json, 'apiError');
  const reason = body.has('reason') && reasons.find((r) => r === body.string('reason'));
  return {
    error: body.string('error'),
    statusCode: body.integer('statusCode', 400),
    message: body.string('message'),
    requestId: body.string('requestId'),
    ...(body.has('fieldErrors') && {
      fieldErrors: body.objects('fieldErrors', (field) => ({
        field: field.string('field'),
        code: field.string('code'),
        message: field.string('message'),
      })),
    }),
    ...(reason && { reason }),
  };
}
