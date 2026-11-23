import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { hartwellTenant, northgateTenant } from '../api/fixtures';
import { JourneyService } from '../journey/journey.service';
import { tenantInterceptor } from './tenant.interceptor';
import { TenantService } from './tenant.service';

let http: HttpTestingController;

function setup(): TenantService {
  history.replaceState(null, '', '/start');
  document.title = 'Retenure';
  document.head.querySelector('link[rel~="icon"]')?.remove();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([tenantInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  http = TestBed.inject(HttpTestingController);
  return TestBed.inject(TenantService);
}

const root = () => document.documentElement.style;
const favicon = () => document.head.querySelector('link[rel~="icon"]')?.getAttribute('href');

describe('TenantService', () => {
  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
    root().removeProperty('--ret-brand-primary');
  });

  it('applies the light theme, title and favicon, and exposes the tenant id', async () => {
    const tenant = setup();
    const loaded = tenant.load();
    http.expectOne('/client/tenant').flush(hartwellTenant);
    await loaded;
    expect(root().getPropertyValue('--ret-brand-primary')).toBe('#1d4d4f');
    expect(root().getPropertyValue('--ret-brand-on-primary')).toBe('#ffffff');
    expect(document.title).toBe('Hartwell Wealth');
    expect(favicon()).toBe('/t/hartwell/favicon.ico');
    expect(tenant.tenantId()).toBe('hartwell');
    expect(tenant.failed()).toBe(false);
  });

  it('never shows one firm after another', async () => {
    const tenant = setup();
    let loaded = tenant.load();
    http.expectOne('/client/tenant').flush(hartwellTenant);
    await loaded;
    loaded = tenant.load();
    http.expectOne('/client/tenant').flush(northgateTenant);
    await loaded;
    expect(root().getPropertyValue('--ret-brand-primary')).toBe('#5b2a86');
    expect(document.title).toBe('Northgate Planning');
  });

  it.each([
    ['an unknown host', { error: 'NOT_FOUND', reason: 'unknown_host' }, 404],
    ['a server error', 'Bad gateway', 502],
    ['an unparseable body', { schemaVersion: 1, tenant: { tenantId: 'Bad Id' } }, 200],
    [
      'a foreign asset url',
      {
        ...hartwellTenant,
        tenant: { ...hartwellTenant.tenant, favicon: 'https://evil.example/x.ico' },
      },
      200,
    ],
  ])('resets to neutral and marks the app failed on %s', async (_name, body, status) => {
    const tenant = setup();
    root().setProperty('--ret-brand-primary', '#123456');
    const loaded = tenant.load();
    http.expectOne('/client/tenant').flush(body, { status, statusText: 'Status' });
    await loaded;
    expect(root().getPropertyValue('--ret-brand-primary')).toBe('');
    expect(document.title).toBe('Retenure');
    expect(favicon()).toBeUndefined();
    expect(tenant.tenantId()).toBeNull();
    expect(tenant.failed()).toBe(true);
  });
});

describe('tenantInterceptor', () => {
  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  async function signedIn(): Promise<void> {
    const tenant = setup();
    const loaded = tenant.load();
    http.expectOne('/client/tenant').flush(hartwellTenant);
    await loaded;
    TestBed.inject(JourneyService).journeyId.set('jrn-hartwell-0001');
  }

  it('leaves X-Tenant-Id and X-Journey-Id off the tenant lookup even once signed in, but sends cookies', async () => {
    await signedIn();
    TestBed.inject(HttpClient).get('/client/tenant').subscribe();
    const request = http.expectOne('/client/tenant').request;
    expect(request.headers.has('X-Tenant-Id')).toBe(false);
    expect(request.headers.has('X-Journey-Id')).toBe(false);
    expect(request.withCredentials).toBe(true);
  });

  it('refuses a protected request locally when there is no tenant', async () => {
    setup();
    const failure = vi.fn();
    TestBed.inject(HttpClient).post('/client/journey/session', {}).subscribe({ error: failure });
    http.expectNone('/client/journey/session');
    expect(failure).toHaveBeenCalled();
  });

  it('stops the journey when the tenant lookup fails', async () => {
    const tenant = setup();
    const journey = TestBed.inject(JourneyService);
    const loaded = tenant.load();
    http.expectOne('/client/tenant').flush('', { status: 404, statusText: 'Not Found' });
    await loaded;
    TestBed.tick();
    expect(journey.stage()).toBe('error');
    expect(journey.errorReason()).toBe('unknown_host');
  });

  it('adds both headers and credentials to protected requests', async () => {
    await signedIn();
    TestBed.inject(HttpClient).post('/client/journey/session', {}).subscribe();
    const request = http.expectOne('/client/journey/session').request;
    expect(request.headers.get('X-Tenant-Id')).toBe('hartwell');
    expect(request.headers.get('X-Journey-Id')).toBe('jrn-hartwell-0001');
    expect(request.withCredentials).toBe(true);
  });

  it('sends the tenant but no journey on verification', async () => {
    await signedIn();
    TestBed.inject(HttpClient).post('/client/verification', {}).subscribe();
    const request = http.expectOne('/client/verification').request;
    expect(request.headers.get('X-Tenant-Id')).toBe('hartwell');
    expect(request.headers.has('X-Journey-Id')).toBe(false);
  });

  it('leaves other requests alone', async () => {
    await signedIn();
    TestBed.inject(HttpClient).get('/t/hartwell/logo.svg').subscribe();
    const request = http.expectOne('/t/hartwell/logo.svg').request;
    expect(request.headers.keys()).toEqual([]);
    expect(request.withCredentials).toBe(false);
  });
});
