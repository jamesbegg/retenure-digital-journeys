import { screen } from '@testing-library/angular';
import {
  answerEverything,
  openPage,
  signIn,
  TEST_DATE_OF_BIRTH,
} from '../../testing/journey-harness';
import routes from './check-in.routes';

const open = (url: string, hash?: string) => openPage(routes, url, hash);

describe('check-in routes', () => {
  it('asks for the email link again when the address has no token in it', async () => {
    const { path } = await open('/check-in/welcome', '');
    expect(path()).toBe('/link-problem');
    screen.getByRole('heading', { level: 1, name: 'Please open the link in your email again' });
  });

  it('sends a client with a token to verify, from any address', async () => {
    const { path } = await open('/');
    expect(path()).toBe('/start');
    screen.getByRole('heading', { level: 1, name: 'Welcome to your check-in' });
  });

  it('shows the welcome page once verified, in the firm header', async () => {
    const { http, journey, path, settle } = await open('/start');
    await signIn(http, journey);
    await settle();
    expect(path()).toBe('/check-in/welcome');
    screen.getByRole('heading', { level: 1, name: 'Your annual check-in' });
    screen.getByText('Hartwell Wealth');
    screen.getByRole('list');
  });

  it('keeps a status page for its own stage', async () => {
    const { path } = await open('/locked');
    expect(path()).toBe('/start');
  });

  it('moves to the locked page when verification is locked', async () => {
    const { http, journey, path, settle } = await open('/start');
    const done = journey.verify(TEST_DATE_OF_BIRTH);
    http.expectOne('/client/verification').flush(
      {
        error: 'FORBIDDEN',
        statusCode: 403,
        message: 'Locked',
        requestId: 'r1',
        reason: 'verification_locked',
      },
      { status: 403, statusText: 'Forbidden' },
    );
    await done;
    await settle();
    expect(path()).toBe('/locked');
    screen.getByRole('heading', { level: 1, name: "We've paused this check-in" });
    expect(screen.queryByRole('group', { name: 'Your adviser' })).toBeNull();
  });

  it('keeps a section link opened before verifying, and lands on it once verified', async () => {
    const { http, journey, path, settle } = await open('/check-in/section/sec-changes');
    expect(path()).toBe('/start');
    await signIn(http, journey);
    await settle();
    expect(path()).toBe('/check-in/section/sec-changes');
    screen.getByRole('heading', { level: 1, name: 'What has changed' });
  });

  it('brings the client back to the same section, with their answers, after the session lapses', async () => {
    const { http, journey, path, settle, harness } = await open('/start');
    await signIn(http, journey);
    await settle();
    await harness.navigateByUrl('/check-in/section/sec-changes');
    journey.setAnswers('sec-changes', { 'q-moved': { kind: 'yesNo', value: true } });

    const renewed = journey.renew();
    http.expectOne('/client/journey/session').flush(
      {
        error: 'UNAUTHORIZED',
        statusCode: 401,
        message: 'Gone',
        requestId: 'r1',
        reason: 'session_expired',
      },
      { status: 401, statusText: 'Unauthorized' },
    );
    await renewed;
    await settle();
    expect(path()).toBe('/start');

    await signIn(http, journey);
    await settle();
    expect(path()).toBe('/check-in/section/sec-changes');
    expect(journey.answers()['sec-changes']).toEqual({ 'q-moved': { kind: 'yesNo', value: true } });
  });

  describe('Check your answers', () => {
    async function openReview() {
      const page = await open('/start');
      await signIn(page.http, page.journey);
      await page.settle();
      return page;
    }

    it('goes to the first section with a required question unanswered, so Send never posts empty answers', async () => {
      const { harness, path, journey } = await openReview();
      await harness.navigateByUrl('/check-in/review');
      expect(path()).toBe('/check-in/section/sec-about-you');

      journey.setAnswers('sec-about-you', {
        'q-email': { kind: 'yesNo', value: true },
        'q-tom-dob': { kind: 'date', value: '1978-03-14' },
      });
      await harness.navigateByUrl('/check-in/review');
      expect(path()).toBe('/check-in/section/sec-changes');
    });

    it('opens once every required question is answered', async () => {
      const { harness, path, journey } = await openReview();
      answerEverything(journey);
      await harness.navigateByUrl('/check-in/review');
      expect(path()).toBe('/check-in/review');
    });
  });
});
