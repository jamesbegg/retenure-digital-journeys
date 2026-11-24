import { screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { hartwellOpenJourney } from '../../../../api/fixtures';
import { answerEverything, openPage, signIn } from '../../../../testing/journey-harness';
import routes from '../../check-in.routes';

const [first, second] = hartwellOpenJourney.sections;

async function openReview() {
  const page = await openPage(routes, '/start');
  await signIn(page.http, page.journey);
  answerEverything(page.journey);
  await page.settle();
  await page.harness.navigateByUrl('/check-in/review');
  const user = userEvent.setup();
  const send = () => user.click(screen.getByRole('button', { name: /^Send to / }));
  return { ...page, user, send };
}

const refusal = (reason: string, extra = {}) => ({
  error: 'ERROR',
  statusCode: 400,
  message: 'Safe',
  requestId: 'r1',
  reason,
  ...extra,
});

describe('Check your answers', () => {
  it('shows one card per section with its questions and answers, in the order asked', async () => {
    await openReview();
    screen.getByRole('heading', { level: 1, name: 'Check your answers' });
    const cards = screen.getAllByRole('region');
    expect(cards.map((card) => within(card).getByRole('heading').textContent)).toEqual([
      first.title,
      second.title,
    ]);
    const [about] = cards;
    const rows = within(about)
      .getAllByRole('term')
      .map((t) => t.textContent);
    expect(rows).toEqual([
      'Is priya.shah@example.com still the best email for you?',
      "What is Tom's date of birth?",
    ]);
    within(about).getByText('No. priya@example.test');
    within(about).getByText('14 March 1978');
  });

  it('keeps a card for a section with no answers, so the client can go back and add one', async () => {
    const page = await openReview();
    page.journey.setAnswers(second.id, {});
    await page.settle();
    const card = screen.getByRole('region', { name: second.title });
    expect(within(card).queryAllByRole('term')).toHaveLength(0);
    await page.user.click(within(card).getByRole('button', { name: 'Make a change' }));
    expect(page.path()).toBe(`/check-in/section/${second.id}`);
  });

  it('takes "Make a change" back to that section', async () => {
    const page = await openReview();
    const card = screen.getByRole('region', { name: second.title });
    await page.user.click(within(card).getByRole('button', { name: 'Make a change' }));
    expect(page.path()).toBe(`/check-in/section/${second.id}`);
  });

  it('sends every answer once and shows the pending state so a second press does nothing', async () => {
    const page = await openReview();
    await page.send();
    await page.send();
    const request = page.http.expectOne('/client/journey/submission');
    expect(request.request.body.answers.map((a: { questionId: string }) => a.questionId)).toEqual([
      'q-email',
      'q-tom-dob',
      'q-moved',
      'q-spending',
    ]);
    expect(screen.getByRole('button', { name: /^Send to / }).getAttribute('aria-disabled')).toBe(
      'true',
    );
  });

  it('says nothing was lost when the send does not get through, and keeps the answers', async () => {
    const page = await openReview();
    await page.send();
    page.http.expectOne('/client/journey/submission').flush('Bad gateway', {
      status: 502,
      statusText: 'Bad Gateway',
    });
    await page.settle();
    screen.getByRole('alert');
    screen.getByText("We couldn't send your answers");
    expect(screen.queryAllByRole('button', { name: 'Make a change' })).toHaveLength(0);
    within(screen.getByRole('region', { name: first.title })).getByText('14 March 1978');
  });

  it('goes to the section the backend refused, so its message shows there', async () => {
    const page = await openReview();
    await page.send();
    page.http.expectOne('/client/journey/submission').flush(
      refusal('invalid_submission', {
        fieldErrors: [{ field: 'answers.q-tom-dob', code: 'tooYoung', message: 'Check the year' }],
      }),
      { status: 400, statusText: 'Bad Request' },
    );
    await page.settle();
    expect(page.path()).toBe(`/check-in/section/${first.id}`);
    screen.getByText('Check the year');
  });

  it('treats a refusal that names no question on screen as a failed send, so the client can try again', async () => {
    const page = await openReview();
    await page.send();
    page.http.expectOne('/client/journey/submission').flush(
      refusal('invalid_submission', {
        fieldErrors: [{ field: 'answers.q-gone', code: 'x', message: 'Check it' }],
      }),
      { status: 400, statusText: 'Bad Request' },
    );
    await page.settle();
    expect(page.path()).toBe('/check-in/review');
    screen.getByText("We couldn't send your answers");
    expect(screen.queryAllByRole('button', { name: 'Make a change' })).toHaveLength(0);
  });

  it('offers no way back to the answers while the send is pending, and a 502 retry sends the same payload', async () => {
    const page = await openReview();
    await page.send();
    const first = page.http.expectOne('/client/journey/submission');
    await page.settle();
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
    expect(screen.queryAllByRole('button', { name: 'Make a change' })).toHaveLength(0);
    await page.harness.navigateByUrl(`/check-in/section/${second.id}`);
    expect(page.path()).toBe('/check-in/review');
    await page.harness.navigateByUrl('/check-in/welcome');
    expect(page.path()).toBe('/check-in/review');
    first.flush('Bad gateway', { status: 502, statusText: 'Bad Gateway' });
    await page.settle();
    await page.send();
    const retry = page.http.expectOne('/client/journey/submission');
    expect(retry.request.body).toEqual(first.request.body);
  });

  it('keeps the client on Check your answers after a 502, so no edit can look saved and be dropped', async () => {
    const page = await openReview();
    await page.send();
    page.http.expectOne('/client/journey/submission').flush('Bad gateway', {
      status: 502,
      statusText: 'Bad Gateway',
    });
    await page.settle();
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
    await page.harness.navigateByUrl(`/check-in/section/${first.id}`);
    expect(page.path()).toBe('/check-in/review');
  });
});
