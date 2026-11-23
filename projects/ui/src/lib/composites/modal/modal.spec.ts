import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { Modal } from './modal';

// jsdom has no showModal or close, so these stand in for the browser's dialog behaviour.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});

const template = (attrs = '') => `
  <button>Open</button>
  <ret-modal heading="Do you need more time?" primaryLabel="I need more time" secondaryLabel="Leave" ${attrs}>
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

const dialog = () => screen.getByRole('dialog', { hidden: true });

describe('Modal', () => {
  it('stays closed until opened', async () => {
    await renderModal('[(open)]="open"');
    expect(dialog().hasAttribute('open')).toBe(false);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens as a native dialog named by its title, with the projected body', async () => {
    const { set } = await renderModal('[(open)]="open"');
    await set(true);
    const open = screen.getByRole('dialog', { name: 'Do you need more time?' });
    expect(open.tagName).toBe('DIALOG');
    expect(open.textContent).toContain('You have been inactive.');
  });

  it('moves focus to the primary action, then restores it to the opener on close', async () => {
    const { set } = await renderModal('[(open)]="open"');
    const opener = screen.getByRole('button', { name: 'Open' });
    opener.focus();
    await set(true);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'I need more time' }));
    await set(false);
    expect(document.activeElement).toBe(opener);
  });

  it('puts focus on the safe action for the danger tone', async () => {
    const { set } = await renderModal('tone="danger" [(open)]="open"');
    await set(true);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Leave' }));
  });

  it('closes when the browser closes the dialog on Escape, and restores focus', async () => {
    const { set, fixture } = await renderModal('[(open)]="open"');
    const opener = screen.getByRole('button', { name: 'Open' });
    opener.focus();
    await set(true);
    dialog().removeAttribute('open');
    dialog().dispatchEvent(new Event('close'));
    await fixture.whenStable();
    expect(fixture.componentInstance.open).toBe(false);
    expect(document.activeElement).toBe(opener);
  });

  it('closes from the Close button', async () => {
    const { fixture, set } = await renderModal('[(open)]="open"');
    await set(true);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Close' }));
    expect(fixture.componentInstance.open).toBe(false);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('names the Close button from closeLabel', async () => {
    const { set } = await renderModal('closeLabel="Dismiss" [(open)]="open"');
    await set(true);
    screen.getByRole('button', { name: 'Dismiss' });
  });

  it('emits each action and leaves closing to the caller', async () => {
    const primary = vi.fn();
    const secondary = vi.fn();
    const { set } = await renderModal(
      '[(open)]="open" (primaryPressed)="primary()" (secondaryPressed)="secondary()"',
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

  it('reflects its tone on the host', async () => {
    const { container } = await renderModal('tone="danger"');
    expect(container.querySelector('ret-modal')?.getAttribute('data-tone')).toBe('danger');
  });
});
