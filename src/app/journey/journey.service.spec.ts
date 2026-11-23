import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AnswerValue } from '@retenure/ui';
import {
  hartwellExpiredJourney,
  hartwellOpenJourney,
  hartwellSubmittedJourney,
} from '../api/fixtures';
import { TenantService } from '../tenant/tenant.service';
import { JourneyService } from './journey.service';

const NOW = new Date('2026-11-20T15:00:00.000Z');
const MINUTE = 60_000;
const ID = hartwellOpenJourney.journey.id;
const yes: AnswerValue = { kind: 'yesNo', value: true };

const inMinutes = (minutes: number) => new Date(Date.now() + minutes * MINUTE).toISOString();
const openJourney = (minutes = 30) => ({ ...hartwellOpenJourney, expiresAt: inMinutes(minutes) });
const verified = (minutes = 30, journeyId = ID) => ({
  schemaVersion: 1,
  status: 'open',
  journeyId,
  expiresAt: inMinutes(minutes),
});
const apiError = (statusCode: number, reason?: string, extra = {}) => ({
  error: 'ERROR',
  statusCode,
  message: 'Safe',
  requestId: 'req-1',
  ...(reason && { reason }),
  ...extra,
});

let http: HttpTestingController;

function start(hash = '#t=synthetic-token'): JourneyService {
  history.replaceState(null, '', `/start?utm=a${hash}`);
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  http = TestBed.inject(HttpTestingController);
  return TestBed.inject(JourneyService);
}

async function settle(): Promise<void> {
  await vi.advanceTimersByTimeAsync(0);
}

async function answer(url: string, body: object | string, status = 200) {
  const request = http.expectOne(url);
  request.flush(body, { status, statusText: 'Status' });
  await settle();
  return request.request;
}

async function signIn(service: JourneyService, minutes = 30): Promise<void> {
  const done = service.verify('1983-04-17');
  await answer('/client/verification', verified(minutes));
  await answer('/client/journey', openJourney(minutes));
  await done;
}

describe('JourneyService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  describe('opening the link', () => {
    it('removes the token from the address bar before any request, and keeps the query', () => {
      const service = start();
      expect(location.hash).toBe('');
      expect(location.pathname + location.search).toBe('/start?utm=a');
      expect(service.stage()).toBe('verify');
      http.expectNone(() => true);
    });

    it('shows the link-problem page with no token, and sends nothing on verify', async () => {
      const service = start('');
      expect(service.stage()).toBe('link-problem');
      await service.verify('1983-04-17');
      expect(service.stage()).toBe('link-problem');
      http.expectNone(() => true);
    });

    it('stores nothing in the browser', async () => {
      const service = start();
      await signIn(service);
      service.setAnswers('sec-changes', { 'q-moved': yes });
      expect(localStorage.length).toBe(0);
      expect(sessionStorage.length).toBe(0);
    });
  });

  describe('verify', () => {
    it('posts the token and date, then loads the journey for the verified id', async () => {
      const service = start();
      const done = service.verify('1983-04-17');
      const verification = await answer('/client/verification', verified());
      expect(verification.body).toEqual({ token: 'synthetic-token', dateOfBirth: '1983-04-17' });
      expect(service.journeyId()).toBe(ID);
      expect(service.stage()).toBe('loading');
      await answer('/client/journey', openJourney());
      await done;
      expect(service.stage()).toBe('ready');
      expect(service.journey()?.journey.id).toBe(ID);
    });

    it.each([
      ['verification_failed', 401, 'verify'],
      ['verification_locked', 403, 'locked'],
      ['link_reissued', 409, 'link-reissued'],
      ['link_requested', 409, 'link-requested'],
    ] as const)('maps %s to the %s stage', async (reason, status, stage) => {
      const service = start();
      const done = service.verify('1983-04-17');
      await answer('/client/verification', apiError(status, reason), status);
      await done;
      expect(service.stage()).toBe(stage);
      expect(service.verificationFailed()).toBe(reason === 'verification_failed');
    });

    it('shows the generic page for an unexplained error, even a 401, on a public route', async () => {
      const service = start();
      const done = service.verify('1983-04-17');
      await answer('/client/verification', 'Unauthorized', 401);
      await done;
      expect(service.stage()).toBe('error');
    });

    it('clears the failed flag on the next attempt', async () => {
      const service = start();
      let done = service.verify('1990-01-01');
      await answer('/client/verification', apiError(401, 'verification_failed'), 401);
      await done;
      done = service.verify('1983-04-17');
      expect(service.verificationFailed()).toBe(false);
      await answer('/client/verification', verified());
      await answer('/client/journey', openJourney());
      await done;
    });

    it('shows the adviser on the expired page without a session', async () => {
      const service = start();
      const done = service.verify('1983-04-17');
      await answer('/client/verification', hartwellExpiredJourney);
      await done;
      expect(service.stage()).toBe('expired');
      expect(service.adviser()?.name).toBe('Helen Hartwell');
    });

    it('shows the already-completed page for a receipt from another submission', async () => {
      const service = start();
      const done = service.verify('1983-04-17');
      await answer('/client/verification', hartwellSubmittedJourney);
      await done;
      expect(service.stage()).toBe('already-completed');
      expect(service.submittedAt()).toBe(hartwellSubmittedJourney.submittedAt);
    });
  });

  describe('load failures', () => {
    it('resets the tenant and discards the journey on a recognised reason', async () => {
      const service = start();
      const reset = vi.spyOn(TestBed.inject(TenantService), 'reset');
      const done = service.verify('1983-04-17');
      await answer('/client/verification', verified());
      await answer('/client/journey', apiError(409, 'journey_mismatch'), 409);
      await done;
      expect(service.stage()).toBe('error');
      expect(service.errorReason()).toBe('journey_mismatch');
      expect(service.journey()).toBeNull();
      expect(reset).toHaveBeenCalled();
    });

    it('lets a recognised reason win over the status', async () => {
      const service = start();
      const done = service.verify('1983-04-17');
      await answer('/client/verification', verified());
      await answer('/client/journey', apiError(403, 'unsupported_plan'), 403);
      await done;
      expect(service.stage()).toBe('error');
      expect(service.errorReason()).toBe('unsupported_plan');
    });

    it.each([401, 403])(
      'treats an unexplained %i on a protected route as an expired session',
      async (status) => {
        const service = start();
        const done = service.verify('1983-04-17');
        await answer('/client/verification', verified());
        await answer('/client/journey', 'Forbidden', status);
        await done;
        expect(service.stage()).toBe('verify');
      },
    );

    it('falls back to the generic page for an unexplained 500 or an unparseable body', async () => {
      const service = start();
      const done = service.verify('1983-04-17');
      await answer('/client/verification', verified());
      await answer('/client/journey', { schemaVersion: 2 });
      await done;
      expect(service.stage()).toBe('error');
    });
  });

  describe('session timing', () => {
    it('does not renew while more than 25 minutes remain', async () => {
      const service = start();
      await signIn(service, 30);
      document.dispatchEvent(new KeyboardEvent('keydown'));
      await vi.advanceTimersByTimeAsync(4 * MINUTE);
      document.dispatchEvent(new KeyboardEvent('keydown'));
      http.expectNone('/client/journey/session');
    });

    it('renews once on activity when under 25 minutes remain, from the server deadline', async () => {
      const service = start();
      await signIn(service, 30);
      await vi.advanceTimersByTimeAsync(6 * MINUTE);
      document.dispatchEvent(new KeyboardEvent('keydown'));
      document.dispatchEvent(new Event('pointerdown'));
      const renewal = http.expectOne('/client/journey/session');
      expect(renewal.request.body).toEqual({});
      renewal.flush({ schemaVersion: 1, expiresAt: inMinutes(36) });
      await settle();
      document.dispatchEvent(new KeyboardEvent('keydown'));
      http.expectNone('/client/journey/session');
      expect(service.stage()).toBe('ready');
    });

    it('warns an idle tab 2 minutes before the deadline, and I need more time renews', async () => {
      const service = start();
      await signIn(service, 30);
      await vi.advanceTimersByTimeAsync(27 * MINUTE + 59_000);
      expect(service.idleWarning()).toBe(false);
      await vi.advanceTimersByTimeAsync(1_000);
      expect(service.idleWarning()).toBe(true);
      const extending = service.extend();
      await answer('/client/journey/session', { schemaVersion: 1, expiresAt: inMinutes(60) });
      await extending;
      expect(service.idleWarning()).toBe(false);
      await vi.advanceTimersByTimeAsync(31 * MINUTE);
      expect(service.stage()).toBe('ready');
    });

    it('goes to verification when the deadline passes', async () => {
      const service = start();
      await signIn(service, 30);
      await vi.advanceTimersByTimeAsync(30 * MINUTE);
      expect(service.stage()).toBe('verify');
    });

    it('goes to verification when a sleeping tab wakes after the deadline', async () => {
      const service = start();
      await signIn(service, 30);
      vi.setSystemTime(new Date(NOW.getTime() + 45 * MINUTE));
      document.dispatchEvent(new Event('visibilitychange'));
      expect(service.stage()).toBe('verify');
    });

    it('warns when a tab wakes inside the last 2 minutes', async () => {
      const service = start();
      await signIn(service, 30);
      vi.setSystemTime(new Date(NOW.getTime() + 29 * MINUTE));
      document.dispatchEvent(new Event('visibilitychange'));
      expect(service.idleWarning()).toBe(true);
      expect(service.stage()).toBe('ready');
    });

    it('retries a failed renewal once, then waits for the next activity', async () => {
      const service = start();
      await signIn(service, 30);
      await vi.advanceTimersByTimeAsync(10 * MINUTE);
      document.dispatchEvent(new KeyboardEvent('keydown'));
      await answer('/client/journey/session', 'Bad gateway', 502);
      await answer('/client/journey/session', 'Bad gateway', 502);
      expect(service.stage()).toBe('ready');
      document.dispatchEvent(new KeyboardEvent('keydown'));
      await answer('/client/journey/session', { schemaVersion: 1, expiresAt: inMinutes(40) });
    });

    it('treats a failed renewal after the deadline as expired', async () => {
      const service = start();
      await signIn(service, 30);
      await vi.advanceTimersByTimeAsync(29 * MINUTE);
      document.dispatchEvent(new KeyboardEvent('keydown'));
      vi.setSystemTime(new Date(NOW.getTime() + 31 * MINUTE));
      await answer('/client/journey/session', 'Bad gateway', 502);
      expect(service.stage()).toBe('verify');
    });

    it('treats an unexplained 403 on renewal as an expired session', async () => {
      const service = start();
      await signIn(service, 30);
      await vi.advanceTimersByTimeAsync(10 * MINUTE);
      document.dispatchEvent(new KeyboardEvent('keydown'));
      await answer('/client/journey/session', 'Forbidden', 403);
      expect(service.stage()).toBe('verify');
    });
  });

  describe('reverifying', () => {
    async function lapse(service: JourneyService): Promise<void> {
      await vi.advanceTimersByTimeAsync(30 * MINUTE);
      expect(service.stage()).toBe('verify');
    }

    it('keeps the answers for the same journey', async () => {
      const service = start();
      await signIn(service);
      service.setAnswers('sec-changes', { 'q-moved': yes });
      await lapse(service);
      const done = service.verify('1983-04-17');
      await answer('/client/verification', verified());
      await answer('/client/journey', openJourney());
      await done;
      expect(service.stage()).toBe('ready');
      expect(service.answers()['sec-changes']).toEqual({ 'q-moved': yes });
    });

    it('discards the answers for a different journey', async () => {
      const service = start();
      await signIn(service);
      service.setAnswers('sec-changes', { 'q-moved': yes });
      await lapse(service);
      const done = service.verify('1983-04-17');
      await answer('/client/verification', verified(30, 'jrn-other-0002'));
      await answer('/client/journey', {
        ...openJourney(),
        journey: { ...hartwellOpenJourney.journey, id: 'jrn-other-0002' },
      });
      await done;
      expect(service.answers()).toEqual({});
      expect(service.journeyId()).toBe('jrn-other-0002');
    });
  });

  describe('submit', () => {
    async function ready(): Promise<JourneyService> {
      const service = start();
      await signIn(service);
      service.setAnswers('sec-changes', { 'q-moved': yes });
      return service;
    }

    it('sends only the answered questions, with their versions', async () => {
      const service = await ready();
      const sent = service.submit();
      const request = await answer('/client/journey/submission', {
        schemaVersion: 1,
        submissionId: 'x',
        submittedAt: NOW.toISOString(),
      });
      await sent;
      expect(request.body).toEqual({
        submissionId: expect.stringMatching(/^[0-9a-f-]{36}$/),
        answers: [{ questionId: 'q-moved', questionVersion: 1, answer: yes }],
      });
      expect(service.stage()).toBe('done');
      expect(service.doneName()).toBe('Priya');
      expect(service.answers()).toEqual({});
    });

    it('does nothing on a second press while sending', async () => {
      const service = await ready();
      const first = service.submit();
      void service.submit();
      const request = http.expectOne('/client/journey/submission');
      request.flush({ schemaVersion: 1, submissionId: 'x', submittedAt: NOW.toISOString() });
      await first;
      expect(service.busy()).toBe(false);
    });

    it('keeps the submissionId across a network retry', async () => {
      const service = await ready();
      let sent = service.submit();
      const first = http.expectOne('/client/journey/submission');
      first.error(new ProgressEvent('error'));
      await sent;
      expect(service.submitProblem()).toBe('network');
      expect(service.stage()).toBe('ready');
      sent = service.submit();
      const second = await answer('/client/journey/submission', 'Bad gateway', 502);
      await sent;
      expect((second.body as { submissionId: string }).submissionId).toBe(
        (first.request.body as { submissionId: string }).submissionId,
      );
      expect(service.submitProblem()).toBe('network');
    });

    it('uses a new submissionId once an answer has changed', async () => {
      const service = await ready();
      let sent = service.submit();
      const first = http.expectOne('/client/journey/submission');
      first.error(new ProgressEvent('error'));
      await sent;
      service.setAnswers('sec-changes', { 'q-moved': { kind: 'yesNo', value: false } });
      sent = service.submit();
      const second = http.expectOne('/client/journey/submission');
      expect((second.request.body as { submissionId: string }).submissionId).not.toBe(
        (first.request.body as { submissionId: string }).submissionId,
      );
      second.error(new ProgressEvent('error'));
      await sent;
    });

    it('recovers a lost response: expired session, reverify, receipt with our id, done', async () => {
      const service = await ready();
      const sent = service.submit();
      const lost = http.expectOne('/client/journey/submission');
      const submissionId = (lost.request.body as { submissionId: string }).submissionId;
      lost.flush(apiError(401, 'session_expired'), { status: 401, statusText: 'Unauthorized' });
      await sent;
      expect(service.stage()).toBe('verify');
      const done = service.verify('1983-04-17');
      await answer('/client/verification', { ...hartwellSubmittedJourney, submissionId });
      await done;
      expect(service.stage()).toBe('done');
      expect(service.doneName()).toBeNull();
      expect(service.answers()).toEqual({});
    });

    it('resends the same id and payload when verification says the journey is still open', async () => {
      const service = await ready();
      let sent = service.submit();
      const lost = http.expectOne('/client/journey/submission');
      lost.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
      await sent;
      const done = service.verify('1983-04-17');
      await answer('/client/verification', verified());
      await answer('/client/journey', openJourney());
      await done;
      sent = service.submit();
      const again = http.expectOne('/client/journey/submission');
      expect(again.request.body).toEqual(lost.request.body);
      again.flush({ schemaVersion: 1, submissionId: 'x', submittedAt: NOW.toISOString() });
      await sent;
      expect(service.stage()).toBe('done');
    });

    it('maps invalid_submission field errors to their section', async () => {
      const service = await ready();
      const sent = service.submit();
      await answer(
        '/client/journey/submission',
        apiError(400, 'invalid_submission', {
          fieldErrors: [
            { field: 'answers.q-tom-dob', code: 'tooYoung', message: 'Check the year' },
          ],
        }),
        400,
      );
      await sent;
      expect(service.submitProblem()).toBe('invalid');
      expect(service.fieldErrors()).toEqual({ 'q-tom-dob': 'Check the year' });
      expect(service.invalidSection()).toBe('sec-about-you');
      expect(service.stage()).toBe('ready');
      expect(service.answers()['sec-changes']).toEqual({ 'q-moved': yes });
    });

    it('reloads on journey_expired and shows the expired page', async () => {
      const service = await ready();
      const sent = service.submit();
      await answer('/client/journey/submission', apiError(409, 'journey_expired'), 409);
      await answer('/client/journey', hartwellExpiredJourney);
      await sent;
      expect(service.stage()).toBe('expired');
      expect(service.answers()).toEqual({});
    });

    it('reloads on already_submitted and shows the already-completed page', async () => {
      const service = await ready();
      const sent = service.submit();
      await answer('/client/journey/submission', apiError(409, 'already_submitted'), 409);
      await answer('/client/journey', hartwellSubmittedJourney);
      await sent;
      expect(service.stage()).toBe('already-completed');
    });

    it('shows the generic page for submission_mismatch', async () => {
      const service = await ready();
      const sent = service.submit();
      await answer('/client/journey/submission', apiError(409, 'submission_mismatch'), 409);
      await sent;
      expect(service.stage()).toBe('error');
      expect(service.errorReason()).toBe('submission_mismatch');
    });

    it('logs no answer values', async () => {
      const spies = (['log', 'info', 'warn', 'error'] as const).map((m) =>
        vi.spyOn(console, m).mockImplementation(() => undefined),
      );
      const service = await ready();
      service.setAnswers('sec-changes', {
        'q-savings': { kind: 'money', value: '98765.43' },
      });
      const sent = service.submit();
      await answer('/client/journey/submission', 'Bad gateway', 502);
      await sent;
      expect(JSON.stringify(spies.map((s) => s.mock.calls))).not.toContain('98765');
      spies.forEach((s) => s.mockRestore());
    });
  });

  describe('leaving', () => {
    it('prompts only while there are unsent answers', async () => {
      const service = start();
      await signIn(service);
      const empty = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(empty);
      expect(empty.defaultPrevented).toBe(false);
      service.setAnswers('sec-changes', { 'q-moved': yes });
      const unsent = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(unsent);
      expect(unsent.defaultPrevented).toBe(true);
    });
  });
});
