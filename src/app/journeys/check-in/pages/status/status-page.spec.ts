import { screen } from '@testing-library/angular';
import { hartwellExpiredJourney, hartwellSubmittedJourney } from '../../../../api/fixtures';
import { openPage, TEST_DATE_OF_BIRTH } from '../../../../testing/journey-harness';
import routes from '../../check-in.routes';

const failure = (status: number, reason: string) => ({
  body: { error: 'ERROR', statusCode: status, message: 'Safe', requestId: 'r1', reason },
  init: { status, statusText: 'Status' },
});

async function verifyWith(answer: 'refused' | 'expired' | 'submitted', reason = '') {
  const page = await openPage(routes, '/start');
  const done = page.journey.verify(TEST_DATE_OF_BIRTH);
  const request = page.http.expectOne('/client/verification');
  if (answer === 'refused') {
    const { body, init } = failure(409, reason);
    request.flush(body, init);
  } else {
    request.flush(answer === 'expired' ? hartwellExpiredJourney : hartwellSubmittedJourney);
  }
  await done;
  await page.settle();
  return page;
}

describe('Status pages', () => {
  it.each([
    ['link_reissued', 'A new link is on its way', '/link-reissued'],
    ['link_requested', "We've asked for a new link", '/link-requested'],
  ])('shows the %s page, naming no adviser', async (reason, heading, path) => {
    const { path: current } = await verifyWith('refused', reason);
    expect(current()).toBe(path);
    screen.getByRole('heading', { level: 1, name: heading });
    expect(screen.queryByRole('group', { name: 'Your adviser' })).toBeNull();
  });

  it('tells the client an expired check-in has expired, with the adviser from the response', async () => {
    await verifyWith('expired');
    screen.getByRole('heading', { level: 1, name: 'This check-in link has expired' });
    screen.getByText('Helen Hartwell can send you a new one. Please get in touch.');
    screen.getByRole('link', { name: 'Email Helen Hartwell' });
    expect(screen.queryByRole('button', { name: 'Something urgent or worrying you?' })).toBeNull();
  });

  it('says when an already completed check-in was sent, and what to do if it was not them', async () => {
    await verifyWith('submitted');
    screen.getByRole('heading', { level: 1, name: 'This check-in has already been completed' });
    screen.getByText(/It was sent to Helen Hartwell on \d{1,2} \w+ \d{4}\./);
    screen.getByText(
      "Wasn't you? If you didn't send these answers, contact Helen Hartwell straight away.",
    );
    screen.getByRole('link', { name: 'Email Helen Hartwell' });
  });
});
