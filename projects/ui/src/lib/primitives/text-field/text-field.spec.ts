import { Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { TextFieldType } from '../../interfaces/text-field';
import { TextField } from './text-field';

@Component({
  selector: 'ret-host',
  imports: [TextField, ReactiveFormsModule],
  template: `<ret-text-field
    label="Amount"
    [type]="type()"
    [hint]="hint()"
    [error]="error()"
    [autocomplete]="autocomplete()"
    [readonly]="readonly()"
    [formControl]="control"
  />`,
})
class Host {
  readonly type = input<TextFieldType>('text');
  readonly hint = input<string>();
  readonly error = input<string>();
  readonly autocomplete = input<string>();
  readonly readonly = input(false);
  readonly control = new FormControl('', { nonNullable: true });
}

async function renderField(inputs: Record<string, unknown> = {}) {
  const view = await render(Host, { inputs });
  return { ...view, control: view.fixture.componentInstance.control };
}

const description = (el: HTMLElement) =>
  (el.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent?.trim());

describe('TextField', () => {
  it('labels a single-line text input and round-trips its value', async () => {
    const { control, fixture } = await renderField();
    const field = screen.getByRole('textbox', { name: 'Amount' });
    expect(field.tagName).toBe('INPUT');
    await userEvent.setup().type(field, 'Hello');
    expect(control.value).toBe('Hello');
    control.setValue('Changed');
    await fixture.whenStable();
    expect((field as HTMLInputElement).value).toBe('Changed');
  });

  it('marks the control touched on blur', async () => {
    const { control } = await renderField();
    const user = userEvent.setup();
    await user.click(screen.getByRole('textbox', { name: 'Amount' }));
    await user.tab();
    expect(control.touched).toBe(true);
  });

  it('ties the hint and error to the input and marks it invalid', async () => {
    await renderField({ hint: 'In pounds', error: 'Enter the amount in pounds' });
    const field = screen.getByRole('textbox', { name: 'Amount' });
    expect(description(field)).toEqual(['In pounds', 'Error: Enter the amount in pounds']);
    expect(field.getAttribute('aria-invalid')).toBe('true');
  });

  it('announces an error that appears later through a live region', async () => {
    const { fixture } = await renderField();
    const field = screen.getByRole('textbox', { name: 'Amount' });
    const region = document.querySelector('[aria-live="polite"]')!;
    expect(region.textContent?.trim()).toBe('');
    expect(field.hasAttribute('aria-describedby')).toBe(false);
    fixture.componentRef.setInput('error', 'Enter the amount in pounds');
    await fixture.whenStable();
    expect(document.querySelector('[aria-live="polite"]')).toBe(region);
    expect(region.textContent?.trim()).toBe('Error: Enter the amount in pounds');
  });

  it('takes a multiline answer in a textarea and round-trips it', async () => {
    const { control, fixture } = await renderField({ type: 'multiline', error: 'Too long' });
    const field = screen.getByRole('textbox', { name: 'Amount' }) as HTMLTextAreaElement;
    expect(field.tagName).toBe('TEXTAREA');
    expect(field.getAttribute('aria-invalid')).toBe('true');
    await userEvent.setup().type(field, 'Line one{Enter}Line two');
    expect(control.value).toBe('Line one\nLine two');
    control.setValue('Stored');
    await fixture.whenStable();
    expect(field.value).toBe('Stored');
    control.disable();
    await fixture.whenStable();
    expect(field.disabled).toBe(true);
  });

  it('describes the input by its hint alone when there is no error', async () => {
    await renderField({ hint: 'In pounds' });
    const field = screen.getByRole('textbox', { name: 'Amount' });
    expect(description(field)).toEqual(['In pounds']);
    expect(field.hasAttribute('aria-invalid')).toBe(false);
  });

  it('keeps the pound sign inside the same control as the amount, named by the field', async () => {
    await renderField({ type: 'money' });
    const input = screen.getByRole('textbox', { name: 'Amount' });
    const prefix = screen.getByText('£');
    expect(prefix.parentElement).toBe(input.parentElement);
    expect(description(input)).toContain('£');
  });

  it('clears on reset', async () => {
    const { control, fixture } = await renderField({ type: 'money' });
    control.setValue('3000');
    await fixture.whenStable();
    control.reset();
    await fixture.whenStable();
    expect((screen.getByRole('textbox', { name: 'Amount' }) as HTMLInputElement).value).toBe('');
  });

  it('blocks typing when read-only', async () => {
    const { control } = await renderField({ readonly: true });
    const field = screen.getByRole('textbox', { name: 'Amount' }) as HTMLInputElement;
    expect(field.readOnly).toBe(true);
    await userEvent.setup().type(field, 'x');
    expect(control.value).toBe('');
  });

  it('formats money on blur and emits the plain amount', async () => {
    const { control } = await renderField({ type: 'money' });
    const field = screen.getByRole('textbox', { name: 'Amount' }) as HTMLInputElement;
    expect(field.getAttribute('inputmode')).toBe('decimal');
    expect(description(field)).toEqual(['£']);
    const user = userEvent.setup();
    await user.type(field, '1250000.5');
    await user.tab();
    expect(field.value).toBe('1,250,000.50');
    expect(control.value).toBe('1250000.50');
    await user.clear(field);
    await user.type(field, '£2,000');
    expect(control.value).toBe('2000');
  });

  it('rounds money to pence on blur so the control matches what is shown', async () => {
    const { control } = await renderField({ type: 'money' });
    const field = screen.getByRole('textbox', { name: 'Amount' }) as HTMLInputElement;
    const user = userEvent.setup();
    await user.type(field, '12.345');
    await user.tab();
    expect(field.value).toBe('12.35');
    expect(control.value).toBe('12.35');
  });

  it('does not change the control when a stored amount is only tabbed through', async () => {
    const { control, fixture } = await renderField({ type: 'money' });
    control.setValue('3000');
    await fixture.whenStable();
    const user = userEvent.setup();
    await user.click(screen.getByRole('textbox', { name: 'Amount' }));
    await user.tab();
    expect(control.dirty).toBe(false);
    expect(control.value).toBe('3000');
  });

  it('shows a stored money value formatted and keeps text it cannot read', async () => {
    const { control, fixture } = await renderField({ type: 'money' });
    control.setValue('3000');
    await fixture.whenStable();
    const field = screen.getByRole('textbox', { name: 'Amount' }) as HTMLInputElement;
    expect(field.value).toBe('3,000');
    const user = userEvent.setup();
    await user.clear(field);
    await user.type(field, 'about 3k');
    await user.tab();
    expect(field.value).toBe('about 3k');
    expect(control.value).toBe('about 3k');
  });

  for (const type of ['email', 'tel'] as const) {
    it(`uses the ${type} input type, round-trips, and autocompletes only when asked`, async () => {
      const { control, fixture } = await renderField({ type });
      const field = screen.getByRole('textbox', { name: 'Amount' }) as HTMLInputElement;
      expect(field.getAttribute('type')).toBe(type);
      expect(field.hasAttribute('autocomplete')).toBe(false);
      await userEvent.setup().type(field, '0123');
      expect(control.value).toBe('0123');
      fixture.componentRef.setInput('autocomplete', type);
      await fixture.whenStable();
      expect(field.getAttribute('autocomplete')).toBe(type);
    });
  }

  it('is disabled through the form control', async () => {
    const { control, fixture } = await renderField();
    control.disable();
    await fixture.whenStable();
    expect((screen.getByRole('textbox', { name: 'Amount' }) as HTMLInputElement).disabled).toBe(
      true,
    );
  });
});

describe('TextField date', () => {
  it('describes each of Day, Month and Year by the hint and the error, not only the group', async () => {
    await renderField({ type: 'date', hint: 'For example, 27 3 1962', error: 'Enter a real date' });
    for (const name of ['Day', 'Month', 'Year']) {
      const text = description(screen.getByRole('textbox', { name }));
      expect(text.some((t) => t?.includes('For example, 27 3 1962'))).toBe(true);
      expect(text.some((t) => t?.includes('Enter a real date'))).toBe(true);
    }
  });

  async function renderDate() {
    const view = await renderField({ type: 'date' });
    const group = screen.getByRole('group', { name: 'Amount' });
    const part = (name: string) => screen.getByRole('textbox', { name }) as HTMLInputElement;
    return { ...view, group, part };
  }

  it('asks for day, month and year in a labelled group, in that tab order', async () => {
    const { part, group, control } = await renderDate();
    const user = userEvent.setup();
    const order = [];
    for (const name of ['Day', 'Month', 'Year']) {
      expect(part(name).getAttribute('inputmode')).toBe('numeric');
      expect(group.contains(part(name))).toBe(true);
      await user.tab();
      order.push(document.activeElement);
    }
    expect(order).toEqual([part('Day'), part('Month'), part('Year')]);
    await user.tab();
    expect(control.touched).toBe(true);
  });

  it.each([
    ['Day', '14/03/1996'],
    ['Month', '14-3-1996'],
    ['Year', '14.03.1996'],
    ['Day', ' 1996-03-14 '],
    ['Month', '14 03 1996'],
  ])('fills all three parts when a full date is pasted into %s', async (name, pasted) => {
    const { control, part } = await renderDate();
    const user = userEvent.setup();
    await user.click(part(name));
    await user.paste(pasted);
    expect(['Day', 'Month', 'Year'].map((n) => part(n).value)).toEqual(['14', '03', '1996']);
    expect(control.value).toBe('1996-03-14');
  });

  it('pads a one-digit day and month, and flags a pasted date that is not real', async () => {
    const { control, part, fixture } = await renderDate();
    const user = userEvent.setup();
    await user.click(part('Day'));
    await user.paste('5/3/1962');
    expect(['Day', 'Month', 'Year'].map((n) => part(n).value)).toEqual(['05', '03', '1962']);
    expect(control.value).toBe('1962-03-05');
    await user.click(part('Year'));
    await user.paste('31/02/1996');
    await fixture.whenStable();
    expect(control.value).toBe('');
    expect(control.errors).toEqual({ invalidDate: true });
  });

  it('ignores a paste into a read-only date', async () => {
    const { control } = await renderField({ type: 'date', readonly: true });
    control.setValue('1990-01-01');
    const day = screen.getByRole('textbox', { name: 'Day' }) as HTMLInputElement;
    const user = userEvent.setup();
    await user.click(day);
    await user.paste('14/03/1996');
    expect(control.value).toBe('1990-01-01');
    expect(day.value).toBe('01');
  });

  it('pastes a single part as normal', async () => {
    const { control, part } = await renderDate();
    const user = userEvent.setup();
    await user.click(part('Year'));
    await user.paste('1996');
    expect(part('Year').value).toBe('1996');
    expect(part('Day').value).toBe('');
    expect(control.value).toBe('');
  });

  it('uses bday part tokens when the caller asks for bday', async () => {
    const { fixture, part } = await renderDate();
    expect(part('Day').hasAttribute('autocomplete')).toBe(false);
    fixture.componentRef.setInput('autocomplete', 'bday');
    await fixture.whenStable();
    expect(['Day', 'Month', 'Year'].map((n) => part(n).getAttribute('autocomplete'))).toEqual([
      'bday-day',
      'bday-month',
      'bday-year',
    ]);
  });

  it('rejects a complete date that is not real', async () => {
    const { control, part } = await renderDate();
    const user = userEvent.setup();
    await user.type(part('Day'), '31');
    await user.type(part('Month'), '2');
    await user.type(part('Year'), '1962');
    expect(control.value).toBe('');
    expect(control.errors).toEqual({ invalidDate: true });
    await user.clear(part('Year'));
    await user.type(part('Year'), '62');
    expect(control.errors).toEqual({ invalidDate: true });
    await user.clear(part('Day'));
    await user.type(part('Day'), '28');
    await user.clear(part('Year'));
    await user.type(part('Year'), '1962');
    expect(control.value).toBe('1962-02-28');
    expect(control.errors).toBeNull();
  });

  it('goes back to incomplete when a part is cleared, and is valid again when all are', async () => {
    const { control, part } = await renderDate();
    const user = userEvent.setup();
    await user.type(part('Day'), '5');
    await user.type(part('Month'), '3');
    await user.type(part('Year'), '1962');
    await user.clear(part('Year'));
    expect(control.value).toBe('');
    expect(control.errors).toEqual({ incompleteDate: { missing: ['year'] } });
    await user.clear(part('Day'));
    expect(control.errors).toEqual({ incompleteDate: { missing: ['day', 'year'] } });
    await user.clear(part('Month'));
    expect(control.errors).toBeNull();
  });

  it('emits YYYY-MM-DD once complete and flags the missing parts before that', async () => {
    const { control, part } = await renderDate();
    const user = userEvent.setup();
    await user.type(part('Day'), '5');
    expect(control.value).toBe('');
    expect(control.errors).toEqual({ incompleteDate: { missing: ['month', 'year'] } });
    await user.type(part('Month'), '3');
    await user.type(part('Year'), '1962');
    expect(control.value).toBe('1962-03-05');
    expect(control.errors).toBeNull();
  });

  it('is valid when empty and shows a stored date in its parts', async () => {
    const { control, fixture, part } = await renderDate();
    expect(control.errors).toBeNull();
    control.setValue('1960-11-20');
    await fixture.whenStable();
    expect([part('Day').value, part('Month').value, part('Year').value]).toEqual([
      '20',
      '11',
      '1960',
    ]);
  });

  it('marks only the missing parts invalid when part of a date is entered', async () => {
    const { fixture, part } = await renderDate();
    const user = userEvent.setup();
    await user.type(part('Day'), '5');
    await user.type(part('Month'), '3');
    fixture.componentRef.setInput('error', 'Enter a year');
    await fixture.whenStable();
    expect(['Day', 'Month', 'Year'].map((n) => part(n).getAttribute('aria-invalid'))).toEqual([
      null,
      null,
      'true',
    ]);
  });

  it('describes the group by its error and disables every part', async () => {
    const { group, part, control, fixture } = await renderDate();
    fixture.componentRef.setInput('error', 'Enter a year');
    control.disable();
    await fixture.whenStable();
    expect(description(group)).toEqual(['Error: Enter a year']);
    expect(['Day', 'Month', 'Year'].map((n) => part(n).getAttribute('aria-invalid'))).toEqual([
      'true',
      'true',
      'true',
    ]);
    for (const name of ['Day', 'Month', 'Year']) expect(part(name).matches(':disabled')).toBe(true);
  });
});

describe('TextField without a form', () => {
  it('defaults to large and takes medium', async () => {
    const { container, fixture } = await render(TextField, { inputs: { label: 'Adviser' } });
    expect(container.querySelector('[data-size="lg"]')).not.toBeNull();
    fixture.componentRef.setInput('size', 'md');
    await fixture.whenStable();
    expect(container.querySelector('[data-size="md"]')).not.toBeNull();
  });

  it('uses custom date part labels', async () => {
    await render(TextField, {
      inputs: {
        label: 'Date of birth',
        type: 'date',
        dateLabels: { day: 'D', month: 'M', year: 'Y' },
      },
    });
    screen.getByRole('textbox', { name: 'Y' });
  });
});
