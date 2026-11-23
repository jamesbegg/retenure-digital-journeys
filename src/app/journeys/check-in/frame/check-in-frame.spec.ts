import { screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { openPage, signIn } from '../../../testing/journey-harness';
import routes from '../check-in.routes';

// jsdom has no showModal or close, so these stand in for the browser's dialog behaviour.
const proto = HTMLDialogElement.prototype;
const original = { showModal: proto.showModal, close: proto.close };

beforeAll(() => {
  proto.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  proto.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});

afterAll(() => {
  proto.showModal = original.showModal;
  proto.close = original.close;
});

async function openWelcome() {
  const page = await openPage(routes, '/start');
  await signIn(page.http, page.journey);
  await page.settle();
  return page;
}

describe('the frame around every check-in page', () => {
  it('shows the adviser contact and the urgent link under the content', async () => {
    await openWelcome();
    const contact = screen.getByRole('group', { name: 'Your adviser' });
    within(contact).getByText("Rather talk it through? Email me and we'll arrange a call.");
    within(contact).getByRole('link', { name: 'Email Helen Hartwell' });
    screen.getByRole('button', { name: 'Something urgent or worrying you?' });
  });

  it('opens the urgent help sheet from the link, with a way to reach the adviser now', async () => {
    await openWelcome();
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Something urgent or worrying you?' }));
    const sheet = screen.getByRole('dialog', { name: 'Talk to Helen Hartwell now' });
    expect(sheet.getAttribute('data-placement')).toBe('sheet');
    within(sheet).getByText(
      "You don't need to finish first. Your answers stay on this page while it's open.",
    );
    within(sheet).getByText(/call 999, or Samaritans free on 116 123/);
    within(sheet).getByRole('button', { name: 'Email Helen Hartwell' });
  });

  it('warns of an idle session with the journey copy, and renews it on "I need more time"', async () => {
    const { http, journey, settle } = await openWelcome();
    expect(screen.queryByRole('dialog')).toBeNull();
    journey.idleWarning.set(true);
    await settle();
    const warning = screen.getByRole('dialog', {
      name: "You've been inactive. Do you need more time?",
    });
    await userEvent
      .setup()
      .click(within(warning).getByRole('button', { name: 'I need more time' }));
    http.expectOne('/client/journey/session').flush({
      schemaVersion: 1,
      expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
    });
    await settle();
    expect(journey.idleWarning()).toBe(false);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
