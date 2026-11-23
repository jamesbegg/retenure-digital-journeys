import { render, screen } from '@testing-library/angular';
import { ProgressBar } from './progress-bar';

const inputs = {
  label: 'Your details',
  step: 2,
  total: 6,
  meta: 'About 8 minutes left',
  valueText: 'Step 2 of 6',
};

describe('ProgressBar', () => {
  it('is named by its visible label and described by its meta', async () => {
    await render(ProgressBar, { inputs });
    const bar = screen.getByRole('progressbar', { name: 'Your details' });
    expect(bar.getAttribute('aria-labelledby')).not.toBeNull();
    expect(bar.hasAttribute('aria-label')).toBe(false);
    expect(bar.getAttribute('aria-describedby')).not.toBeNull();
    expect(document.getElementById(bar.getAttribute('aria-describedby')!)?.textContent).toBe(
      'About 8 minutes left',
    );
  });

  it('exposes its step and total', async () => {
    await render(ProgressBar, { inputs });
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuemin')).toBe('0');
    expect(bar.getAttribute('aria-valuemax')).toBe('6');
    expect(bar.getAttribute('aria-valuenow')).toBe('2');
    expect(bar.getAttribute('aria-valuetext')).toBe('Step 2 of 6');
  });

  it('shows the label and the meta text', async () => {
    await render(ProgressBar, { inputs });
    screen.getByText('Your details');
    screen.getByText('About 8 minutes left');
  });

  it('draws one segment per step and fills the first ones reached', async () => {
    const { container } = await render(ProgressBar, { inputs });
    const segments = [...container.querySelectorAll('.segment')];
    expect(segments.map((s) => s.classList.contains('done'))).toEqual([
      true,
      true,
      false,
      false,
      false,
      false,
    ]);
  });

  it('fills the continuous bar to the share completed', async () => {
    const { container } = await render(ProgressBar, {
      inputs: { ...inputs, variant: 'continuous' },
    });
    expect(container.querySelector('.segment')).toBeNull();
    expect(container.querySelector<HTMLElement>('.fill')!.style.inlineSize).toBe('33%');
  });

  it('leaves out the meta and its description when there is none', async () => {
    await render(ProgressBar, {
      inputs: { label: 'Your details', step: 1, total: 3, valueText: 'Step 1 of 3' },
    });
    expect(screen.queryByText('About 8 minutes left')).toBeNull();
    expect(screen.getByRole('progressbar').hasAttribute('aria-describedby')).toBe(false);
  });

  it('caps the fill when the step passes the total', async () => {
    const { container } = await render(ProgressBar, {
      inputs: { ...inputs, step: 9, variant: 'continuous' },
    });
    expect(container.querySelector<HTMLElement>('.fill')!.style.inlineSize).toBe('100%');
  });

  it('draws no segments for step 0 of total 0', async () => {
    const { container } = await render(ProgressBar, { inputs: { ...inputs, step: 0, total: 0 } });
    expect(container.querySelectorAll('.segment')).toHaveLength(0);
  });

  it('fills the continuous bar to 0% for step 0 of total 0, without NaN', async () => {
    const continuous = await render(ProgressBar, {
      inputs: { ...inputs, step: 0, total: 0, variant: 'continuous' },
    });
    expect(continuous.container.querySelector<HTMLElement>('.fill')!.style.inlineSize).toBe('0%');
  });
});
