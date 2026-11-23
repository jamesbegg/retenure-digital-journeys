import { render, screen } from '@testing-library/angular';
import { Notice } from './notice';

const inputs = { heading: 'Helen will read every answer', body: 'Nothing changes until you talk.' };

describe('Notice', () => {
  it('shows the heading and the body', async () => {
    await render(Notice, { inputs });
    screen.getByText('Helen will read every answer');
    screen.getByText('Nothing changes until you talk.');
  });

  it('works without a heading', async () => {
    await render(Notice, { inputs: { body: 'Just the body' } });
    screen.getByText('Just the body');
  });

  it.each(['info', 'success', 'warning', 'danger', 'neutral'] as const)(
    'does not announce a static %s notice',
    async (tone) => {
      await render(Notice, { inputs: { ...inputs, tone } });
      expect(screen.queryByRole('status')).toBeNull();
      expect(screen.queryByRole('alert')).toBeNull();
    },
  );

  it('announces a change politely as a status', async () => {
    await render(Notice, { inputs: { ...inputs, live: 'polite' } });
    screen.getByRole('status');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('announces an urgent change at once as an alert', async () => {
    await render(Notice, { inputs: { ...inputs, tone: 'danger', live: 'assertive' } });
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
