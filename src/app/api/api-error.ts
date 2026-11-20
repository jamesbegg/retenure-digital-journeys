import { ApiError, ClientErrorReason } from '../interfaces/api-error';
import { ParseError, Reader } from './reader';

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

// Null when the body is not the backend's shared error shape (a gateway 401, say), and an
// unrecognised reason is dropped: either way the caller decides from the status code.
export function parseApiError(json: unknown): ApiError | null {
  try {
    const body = Reader.from(json, 'apiError');
    const reason = reasons.find((r) => r === body.raw('reason'));
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
  } catch (error) {
    if (error instanceof ParseError) return null;
    throw error;
  }
}
