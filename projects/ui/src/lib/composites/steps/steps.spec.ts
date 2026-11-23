import { render, screen, within } from '@testing-library/angular';
import { StepItem } from '../../interfaces/steps';
import { Steps } from './steps';

const items: StepItem[] = [
  { label: 'Check what we hold', meta: 'About 3 minutes', state: 'done' },
  { label: 'What has changed', state: 'current' },
  { label: 'Anything else', state: 'todo' },
];

describe('Steps', () => {
  it('lists every step in order, with its meta when it has one', async () => {
    await render(Steps, { inputs: { items } });
    const steps = screen.getAllByRole('listitem');
    expect(steps).toHaveLength(3);
    within(steps[0]).getByText('Check what we hold');
    within(steps[0]).getByText('About 3 minutes');
    within(steps[1]).getByText('What has changed');
    expect(within(steps[1]).queryByText('About 3 minutes')).toBeNull();
    within(steps[2]).getByText('Anything else');
  });

  it('marks only the current step', async () => {
    await render(Steps, { inputs: { items } });
    const steps = screen.getAllByRole('listitem');
    expect(steps.map((s) => s.getAttribute('aria-current'))).toEqual([null, 'step', null]);
  });

  it('shows a tick for a done step and a number for the others', async () => {
    await render(Steps, { inputs: { items } });
    const [done, current, todo] = screen.getAllByRole('listitem');
    expect(within(done).queryByText('1')).toBeNull();
    expect(done.querySelector('svg')).not.toBeNull();
    within(current).getByText('2');
    within(todo).getByText('3');
  });

  it('puts each step in its state on the item', async () => {
    await render(Steps, { inputs: { items } });
    expect(screen.getAllByRole('listitem').map((s) => s.getAttribute('data-state'))).toEqual([
      'done',
      'current',
      'todo',
    ]);
  });

  it('announces a done step with the given label, and no other step', async () => {
    await render(Steps, { inputs: { items, doneLabel: 'Done:' } });
    const [done, current, todo] = screen.getAllByRole('listitem');
    within(done).getByText('Done:');
    expect(within(current).queryByText('Done:')).toBeNull();
    expect(within(todo).queryByText('Done:')).toBeNull();
  });
});
