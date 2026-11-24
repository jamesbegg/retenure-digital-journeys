import { fill } from './fill';

describe('fill', () => {
  it('fills every placeholder, numbers included', () => {
    expect(
      fill('Step {step} of {total} with {adviser}', { step: 2, total: 5, adviser: 'Helen' }),
    ).toBe('Step 2 of 5 with Helen');
  });

  it('leaves a placeholder it has no value for', () => {
    expect(fill('Hello {name}', {})).toBe('Hello {name}');
  });
});
