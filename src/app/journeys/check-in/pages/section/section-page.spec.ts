import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { hartwellOpenJourney } from '../../../../api/fixtures';
import { openPage, signIn } from '../../../../testing/journey-harness';
import routes from '../../check-in.routes';

const [first, second] = hartwellOpenJourney.sections;

async function openSection(id = first.id) {
  const page = await openPage(routes, '/start');
  await signIn(page.http, page.journey);
  await page.settle();
  await page.harness.navigateByUrl(`/check-in/section/${id}`);
  const user = userEvent.setup();
  const next = () => screen.queryByRole('button', { name: 'Continue' });
  return { ...page, user, next };
}

async function answerFirstSection(page: Awaited<ReturnType<typeof openSection>>) {
  await page.user.click(screen.getAllByRole('radio', { name: 'Yes' })[0]);
  await page.user.type(screen.getByLabelText('Day'), '14');
  await page.user.type(screen.getByLabelText('Month'), '03');
  await page.user.type(screen.getByLabelText('Year'), '1978');
}

describe('Section page', () => {
  it('shows the section as the page, with its intro and where the client is in the journey', async () => {
    await openSection();
    screen.getByRole('heading', { level: 1, name: first.title });
    screen.getByText(first.intro!);
    screen.getByRole('progressbar', {
      name: first.title,
      description: `Step 1 of ${hartwellOpenJourney.sections.length + 1}`,
    });
  });

  it('reveals one card at a time, and offers Continue only once every card is answered', async () => {
    const page = await openSection();
    expect(screen.queryByLabelText('Day')).toBeNull();
    expect(page.next()).toBeNull();
    await page.user.click(screen.getAllByRole('radio', { name: 'Yes' })[0]);
    screen.getByLabelText('Day');
    expect(page.next()).toBeNull();
    await answerFirstSection(page);
    expect(page.next()).not.toBeNull();
  });

  it('holds the answers in the journey service, as the renderer gives them', async () => {
    const page = await openSection();
    await answerFirstSection(page);
    expect(page.journey.answers()[first.id]).toEqual({
      'q-email': { kind: 'yesNo', value: true },
      'q-tom-dob': { kind: 'date', value: '1978-03-14' },
    });
  });

  it('goes on to the next section, and Back returns to the one before', async () => {
    const page = await openSection();
    await answerFirstSection(page);
    await page.user.click(page.next()!);
    expect(page.path()).toBe(`/check-in/section/${second.id}`);
    screen.getByRole('heading', { level: 1, name: second.title });
    await page.user.click(screen.getByRole('button', { name: 'Back' }));
    expect(page.path()).toBe(`/check-in/section/${first.id}`);
  });

  it('puts the answers back when the client returns to a section', async () => {
    const page = await openSection();
    await answerFirstSection(page);
    await page.harness.navigateByUrl(`/check-in/section/${second.id}`);
    await page.harness.navigateByUrl(`/check-in/section/${first.id}`);
    expect(page.next()).not.toBeNull();
    expect((screen.getByLabelText('Year') as HTMLInputElement).value).toBe('1978');
  });

  it('goes back to the welcome page from the first section', async () => {
    const page = await openSection();
    await page.user.click(screen.getByRole('button', { name: 'Back' }));
    expect(page.path()).toBe('/check-in/welcome');
  });

  it('starts at the first section when the address names one that is not in the journey', async () => {
    const page = await openSection('no-such-section');
    await page.settle();
    expect(page.path()).toBe(`/check-in/section/${first.id}`);
    screen.getByRole('heading', { level: 1, name: first.title });
  });

  it('shows what the backend said was wrong with an answer on this section', async () => {
    const page = await openSection();
    page.journey.fieldErrors.set({ 'q-tom-dob': 'Check the year: this makes Tom under 18' });
    await page.settle();
    screen.getByRole('alert');
    screen.getByText('Check the year: this makes Tom under 18');
  });
});
