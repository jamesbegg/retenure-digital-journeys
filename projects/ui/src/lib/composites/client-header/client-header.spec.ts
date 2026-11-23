import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { ClientHeader } from './client-header';

const firm = { firmName: 'Hartwell Wealth Planning', firmMark: 'HW' };
const progress = { label: 'Your details', step: 2, total: 6, meta: 'About 8 minutes left' };

describe('ClientHeader', () => {
  it('shows the firm mark and name when there is no progress', async () => {
    await render(ClientHeader, { inputs: firm });
    screen.getByText('Hartwell Wealth Planning');
    screen.getByText('HW');
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('shows progress instead of the firm name when there is progress', async () => {
    await render(ClientHeader, { inputs: { ...firm, progress } });
    screen.getByRole('progressbar', { name: 'Your details' });
    expect(screen.queryByText('Hartwell Wealth Planning')).toBeNull();
  });

  it('shows no Back control unless given a label', async () => {
    await render(ClientHeader, { inputs: firm });
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders Back as a link when given an href', async () => {
    await render(ClientHeader, { inputs: { ...firm, backLabel: 'Back', backHref: '/welcome' } });
    expect(screen.getByRole('link', { name: 'Back' }).getAttribute('href')).toBe('/welcome');
  });

  it('renders Back as a button that emits when there is no href', async () => {
    const back = vi.fn();
    await render(ClientHeader, { inputs: { ...firm, backLabel: 'Back' }, on: { back } });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Back' }));
    expect(back).toHaveBeenCalledTimes(1);
  });

  it('defaults to the mobile layout', async () => {
    const { fixture } = await render(ClientHeader, { inputs: { ...firm, progress } });
    expect((fixture.nativeElement as HTMLElement).dataset['layout']).toBe('mobile');
  });

  it('reflects the desktop layout and still shows progress', async () => {
    const { fixture } = await render(ClientHeader, {
      inputs: { ...firm, progress, layout: 'desktop' },
    });
    expect((fixture.nativeElement as HTMLElement).dataset['layout']).toBe('desktop');
    screen.getByRole('progressbar', { name: 'Your details' });
  });
});
