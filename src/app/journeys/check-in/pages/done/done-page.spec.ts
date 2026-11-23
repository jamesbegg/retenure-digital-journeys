import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { hartwellOpenJourney } from '../../../../api/fixtures';
import { answerEverything, openPage, signIn } from '../../../../testing/journey-harness';
import routes from '../../check-in.routes';

const receipt = {
  schemaVersion: 1,
  submissionId: 'any',
  submittedAt: '2026-11-23T10:00:00.000Z',
};

async function sendFrom(client: typeof hartwellOpenJourney.client & { respondentId?: string }) {
  const page = await openPage(routes, '/start');
  await signIn(page.http, page.journey, client);
  await page.settle();
  answerEverything(page.journey);
  await page.harness.navigateByUrl('/check-in/review');
  await page.settle();
  await userEvent.setup().click(screen.getByRole('button', { name: /^Send to / }));
  page.http.expectOne('/client/journey/submission').flush(receipt);
  await page.settle();
  return page;
}

describe('Done page', () => {
  it('thanks the respondent by name, even when that is the partner, and says who will be in touch', async () => {
    const page = await sendFrom({ ...hartwellOpenJourney.client, respondentId: 'per-tom' });
    expect(page.path()).toBe('/check-in/done');
    screen.getByRole('heading', { level: 1, name: "Thank you, Tom. We've received your answers." });
    screen.getByText('Helen Hartwell will be in touch.');
  });

  it('uses the neutral title when no respondent is named', async () => {
    await sendFrom(hartwellOpenJourney.client);
    screen.getByRole('heading', { level: 1, name: "Thank you. We've received your answers." });
  });

  it('stays on Done whatever address the client goes back to', async () => {
    const page = await sendFrom(hartwellOpenJourney.client);
    for (const url of ['/check-in/review', '/check-in/section/sec-changes', '/start', '/']) {
      await page.harness.navigateByUrl(url);
      expect(page.path()).toBe('/check-in/done');
    }
  });
});
