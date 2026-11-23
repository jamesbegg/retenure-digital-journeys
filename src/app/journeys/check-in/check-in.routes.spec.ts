import { screen } from '@testing-library/angular';
import { openPage, signIn, TEST_DATE_OF_BIRTH } from '../../testing/journey-harness';
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
});
