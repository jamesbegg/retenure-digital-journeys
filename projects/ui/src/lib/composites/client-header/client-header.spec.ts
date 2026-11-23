import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { ClientHeader } from './client-header';

const firm = { firmName: 'Hartwell Wealth Planning', firmMark: 'HW' };
const progress = {
  label: 'Your details',
  step: 2,
  total: 6,
  meta: 'About 8 minutes left',
  valueText: 'Step 2 of 6',
};

describe('ClientHeader', () => {
  it('shows the firm mark and name when there is no progress', async () => {
    await render(ClientHeader, { inputs: firm });
    screen.getByText('Hartwell Wealth Planning');
    screen.getByText('HW');
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('names no firm when it shows progress', async () => {
    const { container } = await render(ClientHeader, { inputs: { ...firm, progress } });
    screen.getByRole('progressbar', { name: 'Your details' });
    expect(screen.queryByText('Hartwell Wealth Planning')).toBeNull();
    expect(container.textContent).not.toContain('HW');
  });

  it('shows no Back control unless given a label', async () => {
    await render(ClientHeader, { inputs: firm });
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders Back as a link when given an href', async () => {
    await render(ClientHeader, { inputs: { ...firm, backLabel: 'Back', backHref: '#welcome' } });
    expect(screen.getByRole('link', { name: 'Back' }).getAttribute('href')).toBe('#welcome');
  });

  it('does not emit back for a link', async () => {
    const back = vi.fn();
    await render(ClientHeader, {
      inputs: { ...firm, backLabel: 'Back', backHref: '#welcome' },
      on: { back },
    });
    await userEvent.setup().click(screen.getByRole('link', { name: 'Back' }));
    expect(back).not.toHaveBeenCalled();
  });

  it('renders Back as a button that emits when there is no href', async () => {
    const back = vi.fn();
    await render(ClientHeader, { inputs: { ...firm, backLabel: 'Back' }, on: { back } });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Back' }));
    expect(back).toHaveBeenCalledTimes(1);
  });
});
