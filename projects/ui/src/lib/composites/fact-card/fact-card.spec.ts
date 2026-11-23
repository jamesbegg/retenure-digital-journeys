import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { FactCardValue } from '../../interfaces/answer';
import { HeldFact } from '../../interfaces/question';
import { FactCard } from './fact-card';

const facts: HeldFact[] = [
  { id: 'f1', label: 'Job', value: 'Practice manager' },
  { id: 'f2', label: 'Salary', value: '£48,000' },
];

const copy = `confirm="Confirm" makeChange="Make a change" confirmed="Confirmed" cancel="Cancel"
  save="Save" factNote="Anything I should know?" requiredMessage="Enter a value" `;

async function renderCard(value: FactCardValue = null, attrs = '') {
  const control = new FormControl<FactCardValue>(value);
  const view = await render(
    `<ret-fact-card heading="Priya" [facts]="facts" ${copy} ${attrs} [formControl]="control" />`,
    { imports: [FactCard, ReactiveFormsModule], componentProperties: { facts, control } },
  );
  return { ...view, control, user: userEvent.setup() };
}

const card = () => screen.getByRole('region', { name: 'Priya' });
const button = (name: string) => within(card()).getByRole('button', { name });

describe('FactCard (question)', () => {
  it('lists each fact as a label and value under the heading, with two actions', async () => {
    await renderCard();
    within(card()).getByRole('heading', { level: 2, name: 'Priya' });
    within(card()).getByText('Job');
    within(card()).getByText('Practice manager');
    within(card()).getByText('£48,000');
    button('Make a change');
    button('Confirm');
    expect(screen.queryByText('Confirmed')).toBeNull();
  });

  it('confirms with no changes, then shows the badge and a Make a change link', async () => {
    const { control, user } = await renderCard();
    await user.click(button('Confirm'));
    expect(control.value).toEqual({ changed: [] });
    expect(control.touched).toBe(true);
    within(card()).getByText('Confirmed');
    expect(within(card()).queryByRole('button', { name: 'Confirm' })).toBeNull();
    button('Make a change');
  });

  it('turns the rows into fields, with the note, Cancel and Save', async () => {
    const { user } = await renderCard();
    await user.click(button('Make a change'));
    expect(within(card()).getByRole('textbox', { name: 'Job' })).toHaveProperty(
      'value',
      'Practice manager',
    );
    within(card()).getByRole('textbox', { name: 'Salary' });
    within(card()).getByRole('textbox', { name: 'Anything I should know?' });
    button('Cancel');
    button('Save');
    expect(within(card()).queryByRole('button', { name: 'Confirm' })).toBeNull();
    expect(document.activeElement).toBe(within(card()).getByRole('textbox', { name: 'Job' }));
  });

  it('saves only the changed facts, trimmed, and the note', async () => {
    const { control, user } = await renderCard();
    await user.click(button('Make a change'));
    const salary = within(card()).getByRole('textbox', { name: 'Salary' });
    await user.clear(salary);
    await user.type(salary, '  £52,000 ');
    await user.type(
      within(card()).getByRole('textbox', { name: 'Anything I should know?' }),
      ' Pay rise ',
    );
    await user.click(button('Save'));
    expect(control.value).toEqual({
      changed: [{ factId: 'f2', newValue: '£52,000' }],
      note: 'Pay rise',
    });
    within(card()).getByText('Confirmed');
    within(card()).getByText('£52,000');
    expect(within(card()).queryByText('£48,000')).toBeNull();
  });

  it('saves a change that was typed back to the held value as no change, with no note key', async () => {
    const { control, user } = await renderCard();
    await user.click(button('Make a change'));
    const job = within(card()).getByRole('textbox', { name: 'Job' });
    await user.type(job, 'x');
    await user.type(job, '{Backspace}');
    await user.click(button('Save'));
    expect(control.value).toEqual({ changed: [] });
  });

  it('does not save a blank value and says so', async () => {
    const { control, user } = await renderCard();
    await user.click(button('Make a change'));
    await user.clear(within(card()).getByRole('textbox', { name: 'Job' }));
    await user.click(button('Save'));
    expect(control.value).toBeNull();
    const field = within(card()).getByRole('textbox', { name: 'Job' });
    expect(field.getAttribute('aria-invalid')).toBe('true');
    within(card()).getByText('Enter a value');
    await user.type(field, 'Nurse');
    expect(within(card()).queryByText('Enter a value')).toBeNull();
    await user.click(button('Save'));
    expect(control.value).toEqual({ changed: [{ factId: 'f1', newValue: 'Nurse' }] });
  });

  it('treats a whitespace-only value as blank', async () => {
    const { control, user } = await renderCard();
    await user.click(button('Make a change'));
    const job = within(card()).getByRole('textbox', { name: 'Job' });
    await user.clear(job);
    await user.type(job, '   ');
    await user.click(button('Save'));
    expect(control.value).toBeNull();
    within(card()).getByText('Enter a value');
  });

  it('cancels back to the unconfirmed rows and drops the edits', async () => {
    const { control, user } = await renderCard();
    await user.click(button('Make a change'));
    await user.type(within(card()).getByRole('textbox', { name: 'Job' }), ' Lead');
    await user.click(button('Cancel'));
    expect(control.value).toBeNull();
    within(card()).getByText('Practice manager');
    button('Confirm');
    await user.click(button('Make a change'));
    expect(within(card()).getByRole('textbox', { name: 'Job' })).toHaveProperty(
      'value',
      'Practice manager',
    );
  });

  it('shows a written value as confirmed, and cancel returns to confirmed', async () => {
    const { user } = await renderCard({ changed: [{ factId: 'f1', newValue: 'Nurse' }] });
    within(card()).getByText('Confirmed');
    within(card()).getByText('Nurse');
    await user.click(button('Make a change'));
    expect(within(card()).getByRole('textbox', { name: 'Job' })).toHaveProperty('value', 'Nurse');
    await user.click(button('Cancel'));
    within(card()).getByText('Confirmed');
  });

  it('empties the control while a confirmed card is edited and restores it on Cancel', async () => {
    const confirmed = { changed: [{ factId: 'f1', newValue: 'Nurse' }], note: 'Moved' };
    const { control, user } = await renderCard(confirmed);
    await user.click(button('Make a change'));
    expect(control.value).toBeNull();
    await user.click(button('Cancel'));
    expect(control.value).toEqual(confirmed);
    within(card()).getByText('Confirmed');
  });

  it('disables every control when the card is disabled mid-edit', async () => {
    const { control, fixture, user } = await renderCard();
    await user.click(button('Make a change'));
    control.disable();
    await fixture.whenStable();
    const controls = [
      ...within(card()).getAllByRole('textbox'),
      button('Cancel'),
      button('Save'),
    ] as HTMLInputElement[];
    expect(controls).toHaveLength(5);
    expect(controls.every((c) => c.disabled)).toBe(true);
  });

  it('shows an error message tied to the card', async () => {
    await renderCard(null, 'error="Answer this question to continue"');
    within(card()).getByText('Answer this question to continue');
    const ids = card().getAttribute('aria-describedby')!.split(' ');
    expect(ids.map((id) => document.getElementById(id)?.textContent)).toContain(
      'Error: Answer this question to continue',
    );
  });

  it('follows the form control when it is reset', async () => {
    const { control, fixture } = await renderCard({ changed: [] });
    control.setValue(null);
    await fixture.whenStable();
    button('Confirm');
  });

  it('disables its actions when the control is disabled', async () => {
    const { control, fixture } = await renderCard();
    control.disable();
    await fixture.whenStable();
    expect((button('Confirm') as HTMLButtonElement).disabled).toBe(true);
    expect((button('Make a change') as HTMLButtonElement).disabled).toBe(true);
  });

  it('tells each Make a change link apart by the card heading', async () => {
    await renderCard({ changed: [] });
    const link = button('Make a change');
    const description = document.getElementById(link.getAttribute('aria-describedby')!);
    expect(description?.textContent).toBe('Priya');
  });
});

describe('FactCard (summary)', () => {
  async function renderSummary() {
    const changeRequested = vi.fn();
    await render(
      `<ret-fact-card variant="summary" heading="Your goals" [facts]="facts" ${copy}
        (changeRequested)="changeRequested()" />`,
      { imports: [FactCard], componentProperties: { facts, changeRequested } },
    );
    return { changeRequested, user: userEvent.setup() };
  }

  it('is read-only: rows and one Make a change link, no Confirm or badge', async () => {
    await renderSummary();
    const region = screen.getByRole('region', { name: 'Your goals' });
    within(region).getByText('Salary');
    within(region).getByText('£48,000');
    expect(within(region).getAllByRole('button')).toHaveLength(1);
    expect(within(region).queryByText('Confirmed')).toBeNull();
    expect(within(region).queryByRole('textbox')).toBeNull();
  });

  it('hides Make a change when changing is not allowed, for the rows alone', async () => {
    await render(
      `<ret-fact-card variant="summary" heading="Your goals" [facts]="facts" ${copy}
        [changeable]="false" />`,
      { imports: [FactCard], componentProperties: { facts } },
    );
    const region = screen.getByRole('region', { name: 'Your goals' });
    within(region).getByText('£48,000');
    expect(within(region).queryByRole('button')).toBeNull();
  });

  it('shows a saved note under the rows with the note label', async () => {
    await render(
      `<ret-fact-card variant="summary" heading="Your goals" [facts]="facts" ${copy}
        [formControl]="control" />`,
      {
        imports: [FactCard, ReactiveFormsModule],
        componentProperties: {
          facts,
          control: new FormControl<FactCardValue>({ changed: [], note: 'A pay rise in March' }),
        },
      },
    );
    const region = screen.getByRole('region', { name: 'Your goals' });
    within(region).getByText('Anything I should know?');
    within(region).getByText('A pay rise in March');
  });

  it('shows no note label when there is no note', async () => {
    await renderSummary();
    expect(screen.queryByText('Anything I should know?')).toBeNull();
  });

  it('asks to change instead of editing in place', async () => {
    const { changeRequested, user } = await renderSummary();
    await user.click(screen.getByRole('button', { name: 'Make a change' }));
    expect(changeRequested).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('textbox')).toBeNull();
  });
});
