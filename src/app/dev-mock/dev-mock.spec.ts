import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { parseJourneyResponse, parseVerificationResponse } from '../api/journey';
import { parseTenantResponse } from '../api/tenant';
import { DEV_MOCK_MARKER, createDevMock } from './dev-mock';

function mock(search: string, hostname = 'hartwell.localhost'): HttpClient {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(withInterceptors([createDevMock(search, hostname)]))],
  });
  return TestBed.inject(HttpClient);
}

const fails = (promise: Promise<unknown>) =>
  promise.then(
    () => undefined,
    (e: { status: number; error: { reason: string } }) => e,
  );

describe('dev mock', () => {
  it('serves each firm its own tenant, by hostname or ?firm=', async () => {
    const byHost = mock('', 'northgate.localhost');
    expect(
      parseTenantResponse(await firstValueFrom(byHost.get('/client/tenant'))).tenant.tenantId,
    ).toBe('northgate');
    TestBed.resetTestingModule();
    const byParam = mock('?firm=northgate');
    expect(
      parseTenantResponse(await firstValueFrom(byParam.get('/client/tenant'))).tenant.tenantId,
    ).toBe('northgate');
  });

  it('serves bodies the real parsers accept', async () => {
    const http = mock('?mock=happy');
    const verified = parseVerificationResponse(
      await firstValueFrom(
        http.post('/client/verification', { token: 't', dateOfBirth: '2000-01-01' }),
      ),
    );
    expect(verified.status).toBe('open');
    expect(parseJourneyResponse(await firstValueFrom(http.get('/client/journey'))).status).toBe(
      'open',
    );
  });

  it('rejects every date but the test date in wrongDob', async () => {
    const http = mock('?mock=wrongDob');
    const wrong = await fails(
      firstValueFrom(http.post('/client/verification', { dateOfBirth: '1990-01-01' })),
    );
    expect(wrong?.error.reason).toBe('verification_failed');
    const right = await firstValueFrom(
      http.post('/client/verification', { dateOfBirth: '1983-04-17' }),
    );
    expect(parseVerificationResponse(right).status).toBe('open');
  });

  it.each([
    ['locked', 403, 'verification_locked'],
    ['linkReissued', 409, 'link_reissued'],
  ])('answers verification for %s', async (scenario, status, reason) => {
    const failure = await fails(
      firstValueFrom(
        mock(`?mock=${scenario}`).post('/client/verification', { dateOfBirth: '1983-04-17' }),
      ),
    );
    expect([failure?.status, failure?.error.reason]).toEqual([status, reason]);
  });

  it.each(['alreadyCompleted', 'expired'])(
    'answers verification for %s without a session',
    async (scenario) => {
      const body = await firstValueFrom(
        mock(`?mock=${scenario}`).post('/client/verification', { dateOfBirth: '1983-04-17' }),
      );
      expect(parseVerificationResponse(body).status).toBe(
        scenario === 'expired' ? 'expired' : 'submitted',
      );
    },
  );

  it('expires the session once in sessionExpired', async () => {
    const http = mock('?mock=sessionExpired');
    await firstValueFrom(http.post('/client/verification', { dateOfBirth: '1983-04-17' }));
    expect((await fails(firstValueFrom(http.get('/client/journey'))))?.error.reason).toBe(
      'session_expired',
    );
    expect(parseJourneyResponse(await firstValueFrom(http.get('/client/journey'))).status).toBe(
      'open',
    );
  });

  it('loses the first submit response, then reports it submitted', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const http = mock('?mock=lostSubmit');
    const body = {
      submissionId: 'sub-1',
      answers: [{ questionId: 'q-moved', answer: { kind: 'yesNo', value: true } }],
    };
    expect(
      (await fails(firstValueFrom(http.post('/client/journey/submission', body))))?.status,
    ).toBe(401);
    const again = parseVerificationResponse(
      await firstValueFrom(http.post('/client/verification', { dateOfBirth: '1983-04-17' })),
    );
    expect(again).toMatchObject({ status: 'submitted', submissionId: 'sub-1' });
    const logged = JSON.stringify(info.mock.calls);
    expect(logged).toContain(DEV_MOCK_MARKER);
    expect(logged).toContain('sub-1');
    expect(logged).toContain('q-moved');
    expect(logged).not.toContain('yesNo');
    info.mockRestore();
  });
});
