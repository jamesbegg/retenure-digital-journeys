import { render, screen } from '@testing-library/angular';
import { Notice } from './notice';

const inputs = { heading: 'Helen will read every answer', body: 'Nothing changes until you talk.' };

describe('Notice', () => {
  it('shows the title and the body', async () => {
    await render(Notice, { inputs });
    screen.getByText('Helen will read every answer');
    screen.getByText('Nothing changes until you talk.');
  });

  it('works without a title', async () => {
    await render(Notice, { inputs: { body: 'Just the body' } });
    screen.getByText('Just the body');
  });

  it.each(['info', 'success', 'neutral'] as const)(
    'announces the %s tone politely',
    async (tone) => {
      await render(Notice, { inputs: { ...inputs, tone } });
      screen.getByRole('status');
      expect(screen.queryByRole('alert')).toBeNull();
    },
  );

  it.each(['warning', 'danger'] as const)('announces the %s tone as an alert', async (tone) => {
    await render(Notice, { inputs: { ...inputs, tone } });
    screen.getByRole('alert');
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('reflects its tone on the host and pairs it with an icon', async () => {
    const { fixture, container } = await render(Notice, { inputs: { ...inputs, tone: 'danger' } });
    expect((fixture.nativeElement as HTMLElement).dataset['tone']).toBe('danger');
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('defaults to info', async () => {
    const { fixture } = await render(Notice, { inputs });
    expect((fixture.nativeElement as HTMLElement).dataset['tone']).toBe('info');
  });
});
