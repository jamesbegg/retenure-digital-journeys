import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { JourneyShell } from './journey-shell';

const slots = `
  <p slot="header">Hartwell Wealth</p>
  <p slot="steps">Step 2 of 4</p>
  <p>Your plans</p>
  <p slot="actions">Continue</p>
  <p slot="contact">Email Helen Hartwell</p>`;

function renderShell(attrs = '', heading = 'Your check-in') {
  const branding = attrs.includes('branding=') ? '' : 'branding="firm"';
  return render(
    `<ret-journey-shell heading="${heading}" ${branding} ${attrs}>${slots}</ret-journey-shell>`,
    {
      imports: [JourneyShell],
    },
  );
}

const h1 = (name = 'Your check-in') => screen.getByRole('heading', { level: 1, name });
const before = (a: Node, b: Node) =>
  !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('JourneyShell', () => {
  it('puts each slot in its landmark around one h1 in the default layout', async () => {
    await renderShell('', 'Your plans for this year');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    const main = screen.getByRole('main');
    within(screen.getByRole('banner')).getByText('Hartwell Wealth');
    within(main).getByText('Your plans');
    within(main).getByText('Continue');
    within(screen.getByRole('contentinfo')).getByText('Email Helen Hartwell');
    expect(before(h1('Your plans for this year'), within(main).getByText('Your plans'))).toBe(true);
    expect(before(within(main).getByText('Your plans'), within(main).getByText('Continue'))).toBe(
      true,
    );
    expect(screen.queryByText('Step 2 of 4')).toBeNull();
    expect(screen.getByRole('status').textContent?.trim()).toBe('');
    expect(main.hasAttribute('aria-busy')).toBe(false);
  });

  it('shows the steps inside main, before the h1, in the with-steps layout', async () => {
    await renderShell('layout="with-steps"');
    const steps = within(screen.getByRole('main')).getByText('Step 2 of 4');
    expect(before(steps, h1())).toBe(true);
  });

  it('narrows the column and shows no steps in the centred layout', async () => {
    const { container } = await renderShell('layout="centred"');
    expect(container.firstElementChild?.classList).toContain('centred');
    expect(screen.queryByText('Step 2 of 4')).toBeNull();
    h1();
  });

  it('shows no firm header or contact when neutral, whatever the layout', async () => {
    await renderShell('branding="neutral" layout="with-steps"');
    expect(screen.queryByRole('banner')).toBeNull();
    expect(screen.queryByRole('contentinfo')).toBeNull();
    expect(screen.queryByText('Hartwell Wealth')).toBeNull();
    screen.getByText('Step 2 of 4');
    h1();
  });

  it('shows a neutral, busy skeleton with no brand while loading', async () => {
    await renderShell('state="loading" layout="with-steps" loadingLabel="Getting your check-in"');
    expect(screen.getByRole('status').textContent?.trim()).toBe('Getting your check-in');
    expect(screen.getByRole('main').getAttribute('aria-busy')).toBe('true');
    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.queryByRole('banner')).toBeNull();
    expect(screen.queryByRole('contentinfo')).toBeNull();
    expect(screen.queryByText('Your plans')).toBeNull();
    expect(screen.queryByText('Step 2 of 4')).toBeNull();
  });

  it('keeps heading, content, actions and contact but drops the steps in the error state', async () => {
    await renderShell('state="error" layout="with-steps"');
    h1();
    const main = screen.getByRole('main');
    within(main).getByText('Your plans');
    within(main).getByText('Continue');
    expect(screen.queryByText('Step 2 of 4')).toBeNull();
    within(screen.getByRole('contentinfo')).getByText('Email Helen Hartwell');
  });

  it('shows the error content on a neutral page with no firm contact', async () => {
    await renderShell('state="error" branding="neutral"');
    within(screen.getByRole('main')).getByText('Your plans');
    expect(screen.queryByRole('contentinfo')).toBeNull();
  });

  it('shows a blocked page with heading, content and its action, no steps, keeping the contact', async () => {
    await renderShell('state="blocked" layout="with-steps"');
    h1();
    within(screen.getByRole('main')).getByText('Your plans');
    within(screen.getByRole('main')).getByText('Continue');
    expect(screen.queryByText('Step 2 of 4')).toBeNull();
    within(screen.getByRole('contentinfo')).getByText('Email Helen Hartwell');
  });

  it('moves focus to main from the skip link by keyboard without changing the URL', async () => {
    await renderShell('skipLinkLabel="Skip to your questions"');
    const user = userEvent.setup();
    const hash = location.hash;
    await user.tab();
    const skip = screen.getByRole('link', { name: 'Skip to your questions' });
    expect(document.activeElement).toBe(skip);
    expect(skip.getAttribute('href')).toBe(`#${screen.getByRole('main').id}`);
    await user.keyboard('{Enter}');
    expect(document.activeElement).toBe(screen.getByRole('main'));
    expect(location.hash).toBe(hash);
  });

  async function renderStateful(state: 'ready' | 'error') {
    const { fixture } = await render(JourneyShell, {
      inputs: { heading: 'We could not save your answers', branding: 'firm', state },
    });
    return async (next: string) => {
      fixture.componentRef.setInput('state', next);
      await fixture.whenStable();
    };
  }

  it('announces loading through a status region that exists before and after', async () => {
    const setState = await renderStateful('ready');
    const status = screen.getByRole('status');
    await setState('loading');
    expect(screen.getByRole('status')).toBe(status);
    expect(status.textContent?.trim()).toBe('Loading');
    await setState('ready');
    expect(status.textContent?.trim()).toBe('');
  });

  for (const state of ['error', 'blocked']) {
    it(`moves focus to the h1 when the state changes to ${state}`, async () => {
      const setState = await renderStateful('ready');
      await setState(state);
      expect(document.activeElement).toBe(h1('We could not save your answers'));
    });
  }

  it('leaves focus alone on first render', async () => {
    await render(JourneyShell, {
      inputs: { heading: 'Your check-in', branding: 'firm', state: 'error' },
    });
    expect(document.activeElement).toBe(document.body);
  });

  it('gives each shell its own main id', async () => {
    await render(
      `<ret-journey-shell heading="A" branding="neutral" /><ret-journey-shell heading="B" branding="neutral" />`,
      {
        imports: [JourneyShell],
      },
    );
    const [a, b] = screen.getAllByRole('main');
    expect(a.id).not.toBe(b.id);
  });
});
