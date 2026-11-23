import { render, screen } from '@testing-library/angular';
import { ProgressBar } from './progress-bar';

const inputs = { label: 'Your details', step: 2, total: 6, meta: 'About 8 minutes left' };

describe('ProgressBar', () => {
  it('is a named progress bar with its step and total', async () => {
    await render(ProgressBar, { inputs });
    const bar = screen.getByRole('progressbar', { name: 'Your details' });
    expect(bar.getAttribute('aria-valuemin')).toBe('0');
    expect(bar.getAttribute('aria-valuemax')).toBe('6');
    expect(bar.getAttribute('aria-valuenow')).toBe('2');
  });

  it('shows the label and the meta text', async () => {
    await render(ProgressBar, { inputs });
    screen.getByText('Your details');
    screen.getByText('About 8 minutes left');
  });

  it('draws one segment per step and fills those reached', async () => {
    const { container } = await render(ProgressBar, { inputs });
    const segments = [...container.querySelectorAll('.segment')];
    expect(segments).toHaveLength(6);
    expect(segments.filter((s) => s.classList.contains('done'))).toHaveLength(2);
  });

  it('fills the continuous bar to the share completed', async () => {
    const { container } = await render(ProgressBar, {
      inputs: { ...inputs, variant: 'continuous' },
    });
    expect(container.querySelector('.segment')).toBeNull();
    expect(container.querySelector<HTMLElement>('.fill')!.style.inlineSize).toBe('33%');
  });

  it('leaves out the meta when there is none', async () => {
    await render(ProgressBar, { inputs: { label: 'Your details', step: 1, total: 3 } });
    expect(screen.queryByText('About 8 minutes left')).toBeNull();
  });

  it('caps the fill when the step passes the total', async () => {
    const { container } = await render(ProgressBar, {
      inputs: { ...inputs, step: 9, variant: 'continuous' },
    });
    expect(container.querySelector<HTMLElement>('.fill')!.style.inlineSize).toBe('100%');
  });
});
