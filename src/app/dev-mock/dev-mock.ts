import {
  HttpErrorResponse,
  HttpEvent,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import {
  hartwellExpiredJourney,
  hartwellOpenJourney,
  hartwellSubmittedJourney,
  hartwellTenant,
  northgateOpenJourney,
  northgateTenant,
} from '../api/fixtures';
import { ClientErrorReason } from '../interfaces/api-error';
import { MockFirm, MockScenario, MockVerificationBody } from '../interfaces/dev-mock';
import { SubmissionBody } from '../interfaces/journey';

// check-dist fails the build if this string reaches dist.
export const DEV_MOCK_MARKER = 'ret-dev-mock';

const TEST_DATE_OF_BIRTH = '1983-04-17';
const scenarios: readonly MockScenario[] = [
  'happy',
  'wrongDob',
  'locked',
  'linkReissued',
  'alreadyCompleted',
  'expired',
  'sessionExpired',
  'lostSubmit',
];

function reply(body: unknown): Observable<HttpEvent<unknown>> {
  return of(new HttpResponse({ status: 200, body }));
}

function refuse(status: number, reason?: ClientErrorReason): Observable<never> {
  const error = {
    error: 'MOCK',
    statusCode: status,
    message: 'Mock refusal',
    requestId: 'mock-request',
    ...(reason && { reason }),
  };
  return throwError(() => new HttpErrorResponse({ status, error }));
}

// Serves /client/* in the browser, for local running only. Scenarios come from ?mock=, the firm
// from ?firm= or the hostname. Logs ids and counts, never answer values.
export function createDevMock(search: string, hostname: string): HttpInterceptorFn {
  const params = new URLSearchParams(search);
  const scenario = scenarios.find((s) => s === params.get('mock')) ?? 'happy';
  const firm: MockFirm = (params.get('firm') ?? hostname).startsWith('northgate')
    ? 'northgate'
    : 'hartwell';
  const tenant = firm === 'northgate' ? northgateTenant : hartwellTenant;
  const open = firm === 'northgate' ? northgateOpenJourney : hartwellOpenJourney;
  const expiresAt = () => new Date(Date.now() + 30 * 60_000).toISOString();
  let sessionExpiredOnce = scenario === 'sessionExpired';
  let lostSubmit = scenario === 'lostSubmit';
  let submissionId: string | null = null;
  const submitted = () => ({
    ...hartwellSubmittedJourney,
    journeyId: open.journey.id,
    ...(submissionId && { submissionId }),
  });

  return (request: HttpRequest<unknown>, next) => {
    const path = request.url.split('?')[0];
    if (!path.startsWith('/client/')) return next(request);
    const log = (message: string) => console.info(`[${DEV_MOCK_MARKER}] ${message}`);

    if (path === '/client/tenant') return reply(tenant);

    if (path === '/client/verification') {
      const body = request.body as MockVerificationBody;
      if (scenario === 'locked') return refuse(403, 'verification_locked');
      if (scenario === 'linkReissued') return refuse(409, 'link_reissued');
      if (scenario === 'wrongDob' && body.dateOfBirth !== TEST_DATE_OF_BIRTH) {
        return refuse(401, 'verification_failed');
      }
      if (scenario === 'alreadyCompleted' || submissionId) return reply(submitted());
      if (scenario === 'expired') {
        return reply({ ...hartwellExpiredJourney, journeyId: open.journey.id });
      }
      return reply({
        schemaVersion: 1,
        status: 'open',
        journeyId: open.journey.id,
        expiresAt: expiresAt(),
      });
    }

    if (sessionExpiredOnce) {
      sessionExpiredOnce = false;
      return refuse(401, 'session_expired');
    }

    if (path === '/client/journey') {
      return reply(submissionId ? submitted() : { ...open, expiresAt: expiresAt() });
    }
    if (path === '/client/journey/session')
      return reply({ schemaVersion: 1, expiresAt: expiresAt() });
    if (path === '/client/journey/submission') {
      const body = request.body as SubmissionBody;
      submissionId = body.submissionId;
      log(
        `submission ${submissionId}, questions ${body.answers.map((a) => a.questionId).join(',')}`,
      );
      if (lostSubmit) {
        lostSubmit = false;
        return refuse(401, 'session_expired');
      }
      return reply({ schemaVersion: 1, submissionId, submittedAt: new Date().toISOString() });
    }
    return refuse(404);
  };
}

export const devMockInterceptors: HttpInterceptorFn[] = [
  createDevMock(location.search, location.hostname),
];
