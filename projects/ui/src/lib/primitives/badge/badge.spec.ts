import { render, screen } from '@testing-library/angular';
import { Badge } from './badge';

describe('Badge', () => {
  it('shows its label as text', async () => {
    await render(Badge, { inputs: { label: 'Confirmed' } });
    screen.getByText('Confirmed');
  });

  it('defaults to a medium neutral badge', async () => {
    const { fixture } = await render(Badge, { inputs: { label: 'Draft' } });
    const host: HTMLElement = fixture.nativeElement;
    expect(host.dataset['tone']).toBe('neutral');
    expect(host.dataset['size']).toBe('md');
  });

  it.each(['neutral', 'success', 'warning', 'danger', 'info'] as const)(
    'reflects the %s tone on the host',
    async (tone) => {
      const { fixture } = await render(Badge, { inputs: { label: 'Status', tone } });
      expect((fixture.nativeElement as HTMLElement).dataset['tone']).toBe(tone);
    },
  );

  it('reflects the small size on the host', async () => {
    const { fixture } = await render(Badge, { inputs: { label: 'Status', size: 'sm' } });
    expect((fixture.nativeElement as HTMLElement).dataset['size']).toBe('sm');
  });

  it('draws a decorative icon only when asked', async () => {
    const { container, rerender } = await render(Badge, { inputs: { label: 'Confirmed' } });
    expect(container.querySelector('svg')).toBeNull();
    await rerender({ inputs: { label: 'Confirmed', icon: 'check' } });
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(screen.queryByRole('img')).toBeNull();
  });
});
