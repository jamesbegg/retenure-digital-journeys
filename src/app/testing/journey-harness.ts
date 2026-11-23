import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Routes, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { hartwellOpenJourney, hartwellTenant } from '../api/fixtures';
import { ClientInfo } from '../interfaces/journey';
import { JourneyService } from '../journey/journey.service';
import { TenantService } from '../tenant/tenant.service';

export const TEST_DATE_OF_BIRTH = '1983-04-17';

const inMinutes = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();

// Real services over a mocked HTTP boundary, so a page is tested against what the client would
// see. The address is set first because the journey service takes the token from it.
export async function startJourney(routes: Routes = [], hash = '#t=synthetic-token') {
  // jsdom has no matchMedia, which the renderer asks before it scrolls a new card into view.
  window.matchMedia ??= (() => ({ matches: false })) as unknown as typeof window.matchMedia;
  history.replaceState(null, '', `/start${hash}`);
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter(routes, withComponentInputBinding()),
    ],
  });
  const http = TestBed.inject(HttpTestingController);
  const journey = TestBed.inject(JourneyService);
  const tenant = TestBed.inject(TenantService);
  const loaded = tenant.load();
  http.expectOne('/client/tenant').flush(hartwellTenant);
  await loaded;
  return { http, journey, tenant };
}

// `client` replaces the sample's client, for a journey whose respondent is named.
export async function signIn(
  http: HttpTestingController,
  journey: JourneyService,
  client = hartwellOpenJourney.client as ClientInfo,
) {
  const done = journey.verify(TEST_DATE_OF_BIRTH);
  http.expectOne('/client/verification').flush({
    schemaVersion: 1,
    status: 'open',
    journeyId: hartwellOpenJourney.journey.id,
    expiresAt: inMinutes(30),
  });
  await new Promise((resolve) => setTimeout(resolve));
  http
    .expectOne('/client/journey')
    .flush({ ...hartwellOpenJourney, client, expiresAt: inMinutes(30) });
  await done;
}

// Starts a journey and opens a page in the router, the way a client's browser would.
export async function openPage(routes: Routes, url: string, hash?: string) {
  const journey = await startJourney(routes, hash);
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  const path = () => TestBed.inject(Location).path();
  // Lets a navigation started by a stage change finish, then renders it.
  const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    await harness.fixture.whenStable();
    harness.detectChanges();
  };
  return { ...journey, harness, path, settle };
}

// Every required question of the sample journey answered, as a client who has finished would have.
export function answerEverything(journey: JourneyService) {
  journey.setAnswers('sec-about-you', {
    'q-email': { kind: 'yesNo', value: false, detail: 'priya@example.test' },
    'q-tom-dob': { kind: 'date', value: '1978-03-14' },
  });
  journey.setAnswers('sec-changes', {
    'q-moved': { kind: 'yesNo', value: true },
    'q-spending': { kind: 'radio', value: 'same' },
  });
}
