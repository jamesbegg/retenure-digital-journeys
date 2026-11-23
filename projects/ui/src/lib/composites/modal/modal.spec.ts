import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { Modal } from './modal';

// jsdom has no showModal or close, so these stand in for the browser's dialog behaviour.
// Real focus trapping and Escape are covered by e2e/modal.spec.ts.
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

const template = (attrs = '') => `
  <button>Open</button>
  <ret-modal heading="Do you need more time?" primaryLabel="I need more time" closeLabel="Close" ${attrs}>
    <p>You have been inactive.</p>
  </ret-modal>`;

async function renderModal(attrs = '', componentProperties: Record<string, unknown> = {}) {
  const view = await render(template(attrs), {
    imports: [Modal],
    componentProperties: { open: false, ...componentProperties },
  });
  const set = async (open: boolean) => {
    view.fixture.componentInstance.open = open;
    view.fixture.changeDetectorRef.markForCheck();
    await view.fixture.whenStable();
  };
  return { ...view, set };
}

const leave = 'secondaryLabel="Leave"';
const dialog = () => screen.getByRole('dialog', { hidden: true });

describe('Modal', () => {
  it('stays closed until opened', async () => {
    await renderModal(`${leave} [(open)]="open"`);
    expect(dialog().hasAttribute('open')).toBe(false);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens as a native dialog named by its heading, with the projected body', async () => {
    const { set } = await renderModal(`${leave} [(open)]="open"`);
    await set(true);
    const open = screen.getByRole('dialog', { name: 'Do you need more time?' });
    expect(open.tagName).toBe('DIALOG');
    expect(open.textContent).toContain('You have been inactive.');
  });

  it('moves focus to the primary action, then restores it to the opener on close', async () => {
    const { set } = await renderModal(`${leave} [(open)]="open"`);
    const opener = screen.getByRole('button', { name: 'Open' });
    opener.focus();
    await set(true);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'I need more time' }));
    await set(false);
    expect(document.activeElement).toBe(opener);
  });

  it('puts focus on the safe action for the danger tone', async () => {
    const { set } = await renderModal(`${leave} tone="danger" [(open)]="open"`);
    await set(true);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Leave' }));
  });

  it('works with only a primary action, even for the danger tone', async () => {
    const { set } = await renderModal('tone="danger" [(open)]="open"');
    await set(true);
    expect(screen.queryByRole('button', { name: 'Leave' })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'I need more time' }));
  });

  it('can be opened, closed and opened again', async () => {
    const { set } = await renderModal(`${leave} [(open)]="open"`);
    const opener = screen.getByRole('button', { name: 'Open' });
    for (let round = 0; round < 2; round++) {
      opener.focus();
      await set(true);
      screen.getByRole('dialog', { name: 'Do you need more time?' });
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'I need more time' }));
      await set(false);
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(document.activeElement).toBe(opener);
    }
  });

  it('restores focus and the open model when the browser closes the dialog', async () => {
    const { set, fixture } = await renderModal(`${leave} [(open)]="open"`);
    const opener = screen.getByRole('button', { name: 'Open' });
    opener.focus();
    await set(true);
    dialog().removeAttribute('open');
    dialog().dispatchEvent(new Event('close'));
    await fixture.whenStable();
    expect(fixture.componentInstance.open).toBe(false);
    expect(document.activeElement).toBe(opener);
  });

  it('puts Close after the heading and before the body, and closes from it', async () => {
    const { fixture, set } = await renderModal(`${leave} [(open)]="open"`);
    const opener = screen.getByRole('button', { name: 'Open' });
    opener.focus();
    await set(true);
    const close = screen.getByRole('button', { name: 'Close' });
    const heading = screen.getByRole('heading', { name: 'Do you need more time?' });
    const body = screen.getByText('You have been inactive.');
    expect(heading.compareDocumentPosition(close) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(close.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await userEvent.setup().click(close);
    await fixture.whenStable();
    expect(fixture.componentInstance.open).toBe(false);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('names the Close button from closeLabel', async () => {
    const { set } = await renderModal(`${leave} closeLabel="Dismiss" [(open)]="open"`);
    await set(true);
    screen.getByRole('button', { name: 'Dismiss' });
  });

  it('emits each action and leaves closing to the caller', async () => {
    const primary = vi.fn();
    const secondary = vi.fn();
    const { set } = await renderModal(
      `${leave} [(open)]="open" (primaryPressed)="primary()" (secondaryPressed)="secondary()"`,
      { primary, secondary },
    );
    await set(true);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'I need more time' }));
    await user.click(screen.getByRole('button', { name: 'Leave' }));
    expect(primary).toHaveBeenCalledTimes(1);
    expect(secondary).toHaveBeenCalledTimes(1);
    screen.getByRole('dialog');
  });

  it.each(['centre', 'sheet'] as const)(
    'reflects the %s placement on the dialog',
    async (placement) => {
      const { set } = await renderModal(`placement="${placement}" [(open)]="open"`);
      await set(true);
      expect(dialog().getAttribute('data-placement')).toBe(placement);
    },
  );

  it('is centred unless asked otherwise', async () => {
    const { set } = await renderModal('[(open)]="open"');
    await set(true);
    expect(dialog().getAttribute('data-placement')).toBe('centre');
  });
});
