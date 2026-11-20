import { render } from '@testing-library/angular';
import { describedBy } from '../../utils/described-by';
import { FieldMessages } from './field-messages';

describe('FieldMessages', () => {
  it('renders the hint and error with ids the field can reference', async () => {
    const { container } = await render(FieldMessages, {
      inputs: { fieldId: 'goals', hint: 'One line is enough', error: 'Enter your goals' },
    });
    expect(container.querySelector('#goals-hint')?.textContent).toBe('One line is enough');
    expect(container.querySelector('#goals-error')?.textContent?.trim()).toBe(
      'Error: Enter your goals',
    );
  });

  it('keeps an empty live region so a later error is announced', async () => {
    const { container, fixture } = await render(FieldMessages, {
      inputs: { fieldId: 'goals', errorPrefix: 'Problem:' },
    });
    const region = container.querySelector('[aria-live="polite"]')!;
    expect(container.querySelector('#goals-hint')).toBeNull();
    expect(region.textContent?.trim()).toBe('');
    fixture.componentRef.setInput('error', 'Enter your goals');
    await fixture.whenStable();
    expect(container.querySelector('[aria-live="polite"]')).toBe(region);
    expect(region.textContent?.trim()).toBe('Problem: Enter your goals');
    fixture.componentRef.setInput('error', undefined);
    await fixture.whenStable();
    expect(region.textContent?.trim()).toBe('');
  });

  it('lists only the messages that are showing, after any extra ids', () => {
    expect(describedBy('f')).toBeNull();
    expect(describedBy('f', 'Hint')).toBe('f-hint');
    expect(describedBy('f', undefined, 'Error')).toBe('f-error');
    expect(describedBy('f', 'Hint', 'Error', 'f-prefix')).toBe('f-prefix f-hint f-error');
  });
});
