import { screen, within } from '@testing-library/angular';
import { hartwellOpenJourney } from '../../../../api/fixtures';
import { openPage, signIn } from '../../../../testing/journey-harness';
import routes from '../../check-in.routes';

describe('Welcome page', () => {
  it('titles the page with the journey and lists one step per section, in order', async () => {
    const page = await openPage(routes, '/start');
    await signIn(page.http, page.journey);
    await page.settle();
    screen.getByRole('heading', { level: 1, name: hartwellOpenJourney.journey.title });
    const steps = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(steps.map((step) => step.textContent?.replace(/^\s*\d+\s*/, '').trim())).toEqual(
      hartwellOpenJourney.sections.map((section) => section.title),
    );
    screen.getByRole('button', { name: 'Continue' });
  });
});
