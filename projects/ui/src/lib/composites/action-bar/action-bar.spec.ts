import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { ActionBarActions } from '../../interfaces/action-bar';
import { ActionBar } from './action-bar';

const names = () => screen.queryAllByRole('button').map((b) => b.textContent?.trim());

async function renderBar(actions: ActionBarActions, inputs: Record<string, unknown> = {}) {
  const outputs = { primary: vi.fn(), secondary: vi.fn(), link: vi.fn() };
  const view = await render(ActionBar, {
    inputs: { actions, ...inputs },
    on: {
      primaryPressed: outputs.primary,
      secondaryPressed: outputs.secondary,
      linkPressed: outputs.link,
    },
  });
  return { ...view, outputs };
}

describe('ActionBar', () => {
  it('renders one primary submit action for single', async () => {
    await renderBar({ kind: 'single', primary: 'Continue' });
    expect(names()).toEqual(['Continue']);
    expect(screen.getByRole('button', { name: 'Continue' }).getAttribute('type')).toBe('submit');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Continue' }));
  });

  it('puts the secondary before the primary for pair, so the primary is last', async () => {
    const { outputs } = await renderBar({ kind: 'pair', secondary: 'Back', primary: 'Confirm' });
    expect(names()).toEqual(['Back', 'Confirm']);
    expect(screen.getByRole('button', { name: 'Back' }).getAttribute('type')).toBe('button');
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Back' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(outputs.secondary).toHaveBeenCalledTimes(1);
    expect(outputs.primary).toHaveBeenCalledTimes(1);
  });

  it('renders Cancel then Save for edit', async () => {
    const { outputs } = await renderBar({ kind: 'edit', cancel: 'Cancel', save: 'Save' });
    expect(names()).toEqual(['Cancel', 'Save']);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(outputs.secondary).toHaveBeenCalledTimes(1);
    expect(outputs.primary).toHaveBeenCalledTimes(1);
  });

  it('adds a link action first, styled as a link', async () => {
    const { outputs } = await renderBar({
      kind: 'single',
      primary: 'Continue',
      link: 'Save and finish later',
    });
    expect(names()).toEqual(['Save and finish later', 'Continue']);
    const link = screen.getByRole('button', { name: 'Save and finish later' });
    expect(link.getAttribute('type')).toBe('button');
    await userEvent.setup().click(link);
    expect(outputs.link).toHaveBeenCalledTimes(1);
    expect(outputs.primary).not.toHaveBeenCalled();
  });

  it('shows progress on the primary and disables the others while pending', async () => {
    const { outputs, fixture } = await renderBar(
      { kind: 'pair', secondary: 'Back', primary: 'Confirm', link: 'Nothing to add' },
      { pending: true },
    );
    const confirm = screen.getByRole('button', { name: 'Confirm' });
    expect(confirm.getAttribute('aria-disabled')).toBe('true');
    expect(confirm.querySelector('ret-icon.spinner')).not.toBeNull();
    expect((screen.getByRole('button', { name: 'Back' }) as HTMLButtonElement).disabled).toBe(true);
    expect(
      (screen.getByRole('button', { name: 'Nothing to add' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    const user = userEvent.setup();
    for (const name of ['Back', 'Confirm', 'Nothing to add']) {
      await user.click(screen.getByRole('button', { name }));
    }
    expect(outputs.primary).not.toHaveBeenCalled();
    expect(outputs.secondary).not.toHaveBeenCalled();
    expect(outputs.link).not.toHaveBeenCalled();

    fixture.componentRef.setInput('pending', false);
    await fixture.whenStable();
    expect(confirm.hasAttribute('aria-disabled')).toBe(false);
    expect((screen.getByRole('button', { name: 'Back' }) as HTMLButtonElement).disabled).toBe(
      false,
    );
    await user.click(confirm);
    expect(outputs.primary).toHaveBeenCalledTimes(1);
  });

  it('tabs link, secondary, primary and activates each by keyboard', async () => {
    const { outputs } = await renderBar({
      kind: 'edit',
      cancel: 'Cancel',
      save: 'Save',
      link: 'Remove this goal',
    });
    const user = userEvent.setup();
    const focused = [];
    for (let i = 0; i < 3; i++) {
      await user.tab();
      focused.push(document.activeElement?.textContent?.trim());
    }
    expect(focused).toEqual(['Remove this goal', 'Cancel', 'Save']);
    await user.keyboard('{Enter}');
    await user.tab({ shift: true });
    await user.keyboard(' ');
    await user.tab({ shift: true });
    await user.keyboard('{Enter}');
    expect(
      [outputs.link, outputs.secondary, outputs.primary].map((o) => o.mock.calls.length),
    ).toEqual([1, 1, 1]);
  });

  it('renders nothing while hidden, and appears when the screen is complete', async () => {
    const { fixture } = await renderBar({ kind: 'single', primary: 'Continue' }, { hidden: true });
    expect(names()).toEqual([]);
    fixture.componentRef.setInput('hidden', false);
    await fixture.whenStable();
    expect(names()).toEqual(['Continue']);
    fixture.componentRef.setInput('hidden', true);
    await fixture.whenStable();
    expect(names()).toEqual([]);
  });

  it('submits the enclosing form from the primary only', async () => {
    const submit = vi.fn((e: Event) => e.preventDefault());
    const { container } = await render(
      `<form><ret-action-bar [actions]="{ kind: 'pair', secondary: 'Back', primary: 'Confirm', link: 'Nothing to add' }" /></form>`,
      { imports: [ActionBar] },
    );
    container.querySelector('form')!.addEventListener('submit', submit);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Back' }));
    await user.click(screen.getByRole('button', { name: 'Nothing to add' }));
    expect(submit).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('stops a pending primary from submitting its form again', async () => {
    const submit = vi.fn((e: Event) => e.preventDefault());
    const { container } = await render(
      `<form><ret-action-bar [actions]="{ kind: 'single', primary: 'Confirm' }" [pending]="true" /></form>`,
      { imports: [ActionBar] },
    );
    container.querySelector('form')!.addEventListener('submit', submit);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Confirm' }));
    expect(submit).not.toHaveBeenCalled();
  });
});
