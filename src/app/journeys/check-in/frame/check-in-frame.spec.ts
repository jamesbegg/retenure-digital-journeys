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
  it('shows the adviser contact under the content', async () => {
    await openWelcome();
    const contact = screen.getByRole('group', { name: 'Your adviser' });
    within(contact).getByText("Rather talk it through? Email me and we'll arrange a call.");
    within(contact).getByRole('link', { name: 'Email Helen Hartwell' });
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
