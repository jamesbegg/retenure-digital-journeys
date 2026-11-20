import { Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { RadioGroupValue, RadioOption } from '../../interfaces/radio-group';
import { RadioGroup } from './radio-group';

const options: RadioOption[] = [
  { value: 'same', label: 'About the same', hint: 'Within a few hundred pounds' },
  { value: 'more', label: 'More', input: { label: 'How much more each month?', type: 'money' } },
  { value: 'less', label: 'Less' },
  { value: 'other', label: 'Something else', input: { label: 'Tell us more', type: 'multiline' } },
];

@Component({
  selector: 'ret-host',
  imports: [RadioGroup, ReactiveFormsModule],
  template: `<ret-radio-group
    label="How has your spending changed?"
    [options]="options"
    [hint]="hint()"
    [error]="error()"
    [formControl]="control"
  />`,
})
class Host {
  readonly hint = input<string>();
  readonly error = input<string>();
  readonly options = options;
  readonly control = new FormControl<RadioGroupValue | null>(null);
}

async function renderGroup(inputs: Record<string, unknown> = {}) {
  const view = await render(Host, { inputs });
  const group = screen.getByRole('group', { name: 'How has your spending changed?' });
  return { ...view, group, control: view.fixture.componentInstance.control };
}

const radio = (name: string) => screen.getByRole('radio', { name }) as HTMLInputElement;
const check = (name: string) => radio(name).closest('label')!.querySelector('.mark ret-icon');

describe('RadioGroup', () => {
  it('lists every option as a card radio in a labelled group, none chosen', async () => {
    const { group, control } = await renderGroup();
    expect(group.tagName).toBe('FIELDSET');
    expect(
      within(group)
        .getAllByRole('radio')
        .map((r) => r.closest('label')!.querySelector('.option-label')!.textContent),
    ).toEqual(['About the same', 'More', 'Less', 'Something else']);
    expect(control.value).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(group.hasAttribute('aria-describedby')).toBe(false);
    expect(group.hasAttribute('data-invalid')).toBe(false);
  });

  it('names and describes options whose values contain spaces', async () => {
    await render(RadioGroup, {
      inputs: {
        label: 'Spending',
        options: [
          { value: 'about the same', label: 'About the same', hint: 'Within a few hundred pounds' },
          { value: 'about the same', label: 'Duplicate value' },
        ],
      },
    });
    const id = radio('About the same').getAttribute('aria-describedby')!;
    expect(document.getElementById(id)?.textContent).toBe('Within a few hundred pounds');
    radio('Duplicate value');
  });

  it('shows nothing chosen for a stored value that is no longer an option', async () => {
    const { control, fixture, group } = await renderGroup();
    control.setValue({ value: 'gone' });
    await fixture.whenStable();
    expect(
      within(group)
        .getAllByRole('radio')
        .some((r) => (r as HTMLInputElement).checked),
    ).toBe(false);
  });

  it('describes an option by its hint', async () => {
    await renderGroup();
    const id = radio('About the same').getAttribute('aria-describedby')!;
    expect(document.getElementById(id)?.textContent).toBe('Within a few hundred pounds');
    expect(radio('Less').hasAttribute('aria-describedby')).toBe(false);
  });

  it('selects by clicking anywhere on the card and shows a check', async () => {
    const { control } = await renderGroup();
    await userEvent.setup().click(screen.getByText('Less'));
    expect(control.value).toEqual({ value: 'less' });
    expect(radio('Less').checked).toBe(true);
    expect(check('Less')).not.toBeNull();
    expect(check('About the same')).toBeNull();
  });

  it('is one tab stop and arrow keys move the selection', async () => {
    const { control } = await renderGroup();
    const user = userEvent.setup();
    await user.tab();
    expect(document.activeElement).toBe(radio('About the same'));
    await user.keyboard(' ');
    expect(control.value).toEqual({ value: 'same' });
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{ArrowDown}');
    expect(control.value).toEqual({ value: 'less' });
    expect(radio('Less').checked).toBe(true);
    expect(control.touched).toBe(false);
  });

  it('reveals an option input when chosen, without moving focus, and sends its value', async () => {
    const { control } = await renderGroup();
    const user = userEvent.setup();
    await user.click(screen.getByText('More'));
    expect(control.value).toEqual({ value: 'more', input: '' });
    const amount = screen.getByRole('textbox', { name: 'How much more each month?' });
    expect(document.activeElement).not.toBe(amount);
    await user.tab();
    expect(document.activeElement).toBe(amount);
    await user.type(amount, '250');
    expect(control.value).toEqual({ value: 'more', input: '250' });
  });

  it('hides the input when another option is chosen, and keeps what was typed for that option', async () => {
    const { control } = await renderGroup();
    const user = userEvent.setup();
    const amount = () =>
      screen.queryByRole('textbox', {
        name: 'How much more each month?',
      }) as HTMLInputElement | null;
    await user.click(screen.getByText('More'));
    await user.type(amount()!, '250');
    await user.click(screen.getByText('Something else'));
    expect(amount()).toBeNull();
    expect(
      (screen.getByRole('textbox', { name: 'Tell us more' }) as HTMLTextAreaElement).value,
    ).toBe('');
    await user.click(screen.getByText('Less'));
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(control.value).toEqual({ value: 'less' });
    await user.click(screen.getByText('More'));
    expect(amount()!.value).toBe('250');
    expect(control.value).toEqual({ value: 'more', input: '250' });
  });

  it('tells a screen reader that a field has appeared for the chosen option', async () => {
    await renderGroup();
    expect(radio('More').hasAttribute('aria-describedby')).toBe(false);
    await userEvent.setup().click(screen.getByText('More'));
    const ids = radio('More').getAttribute('aria-describedby')!.split(' ');
    expect(ids.map((id) => document.getElementById(id)?.textContent?.trim())).toEqual([
      'How much more each month?',
    ]);
  });

  it('takes "Something else" with a text answer as the last option', async () => {
    const { control } = await renderGroup();
    const user = userEvent.setup();
    await user.click(screen.getByText('Something else'));
    await user.type(screen.getByRole('textbox', { name: 'Tell us more' }), 'Paying for a wedding');
    expect(control.value).toEqual({ value: 'other', input: 'Paying for a wedding' });
  });

  it('shows a stored answer with its input, and clears on reset', async () => {
    const { control, fixture } = await renderGroup();
    control.setValue({ value: 'more', input: '300' });
    await fixture.whenStable();
    expect(radio('More').checked).toBe(true);
    expect(
      (screen.getByRole('textbox', { name: 'How much more each month?' }) as HTMLInputElement)
        .value,
    ).toBe('300');
    expect(control.value).toEqual({ value: 'more', input: '300' });
    control.reset();
    await fixture.whenStable();
    expect(
      within(screen.getByRole('group', { name: 'How has your spending changed?' }))
        .getAllByRole('radio')
        .some((r) => (r as HTMLInputElement).checked),
    ).toBe(false);
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('marks touched only when focus leaves the group', async () => {
    const { control } = await renderGroup();
    const user = userEvent.setup();
    await user.click(screen.getByText('More'));
    await user.tab();
    expect(control.touched).toBe(false);
    await user.tab();
    expect(control.touched).toBe(true);
  });

  it('ties hint and error to the group', async () => {
    const { group } = await renderGroup({
      hint: 'Think about the last year',
      error: 'Choose an answer',
    });
    const ids = group.getAttribute('aria-describedby')!.split(' ');
    expect(ids.map((id) => document.getElementById(id)?.textContent?.trim())).toEqual([
      'Think about the last year',
      'Error: Choose an answer',
    ]);
    expect(group.dataset['invalid']).toBe('true');
  });

  it('is disabled through the form control, option input included', async () => {
    const { control, fixture } = await renderGroup();
    control.setValue({ value: 'more', input: '300' });
    control.disable();
    await fixture.whenStable();
    expect(radio('Less').matches(':disabled')).toBe(true);
    expect(
      screen.getByRole('textbox', { name: 'How much more each month?' }).matches(':disabled'),
    ).toBe(true);
    await userEvent.setup().click(screen.getByText('Less'));
    expect(control.value).toEqual({ value: 'more', input: '300' });
    control.enable();
    await fixture.whenStable();
    expect(radio('Less').matches(':disabled')).toBe(false);
    expect(
      screen.getByRole('textbox', { name: 'How much more each month?' }).matches(':disabled'),
    ).toBe(false);
  });

  it('takes medium and large sizes, passing the size to an option input', async () => {
    const { container, fixture } = await render(RadioGroup, {
      inputs: { label: 'Size', options: options.slice(0, 2), size: 'md' },
    });
    expect(container.querySelector('fieldset')!.dataset['size']).toBe('md');
    await userEvent.setup().click(screen.getByText('More'));
    expect(container.querySelector('ret-text-field [data-size]')!.getAttribute('data-size')).toBe(
      'md',
    );
    fixture.componentRef.setInput('size', 'lg');
    await fixture.whenStable();
    expect(container.querySelector('fieldset')!.dataset['size']).toBe('lg');
  });
});
