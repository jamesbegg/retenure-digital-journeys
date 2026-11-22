import { Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { YesNoDetailField, YesNoValue, YesNoVariant } from '../../interfaces/yes-no';
import { YesNo } from './yes-no';

@Component({
  selector: 'ret-host',
  imports: [YesNo, ReactiveFormsModule],
  template: `<ret-yes-no
    label="Do you have any care needs?"
    [variant]="variant()"
    [hint]="hint()"
    [error]="error()"
    [yesLabel]="yesLabel()"
    [noLabel]="noLabel()"
    [detail]="detail()"
    [detailError]="detailError()"
    [formControl]="control"
  />`,
})
class Host {
  readonly variant = input<YesNoVariant>('standalone');
  readonly hint = input<string>();
  readonly error = input<string>();
  readonly yesLabel = input('Yes');
  readonly noLabel = input('No');
  readonly detail = input<YesNoDetailField>();
  readonly detailError = input<string>();
  readonly control = new FormControl<YesNoValue | null>(null);
}

async function renderYesNo(inputs: Record<string, unknown> = {}) {
  const view = await render(Host, { inputs });
  const group = screen.getByRole('group', { name: 'Do you have any care needs?' });
  return { ...view, group, control: view.fixture.componentInstance.control };
}

const radio = (name: string) => screen.getByRole('radio', { name }) as HTMLInputElement;

describe('YesNo', () => {
  it('asks the question as a radio group of two, unanswered at first', async () => {
    const { group, control } = await renderYesNo();
    expect(group.tagName).toBe('FIELDSET');
    expect(group.hasAttribute('aria-describedby')).toBe(false);
    expect(group.querySelector('legend ret-icon')).toBeNull();
    expect(within(group).getAllByRole('radio')).toHaveLength(2);
    expect(radio('Yes').checked || radio('No').checked).toBe(false);
    expect(control.value).toBeNull();
  });

  it('sets true for yes and false for no, with a visible check on the choice', async () => {
    const { control, group } = await renderYesNo();
    const user = userEvent.setup();
    await user.click(screen.getByText('Yes'));
    expect(control.value).toEqual({ value: true });
    expect(radio('Yes').closest('label')!.querySelector('ret-icon')).not.toBeNull();
    await user.click(screen.getByText('No'));
    expect(control.value).toEqual({ value: false });
    expect(radio('Yes').closest('label')!.querySelector('ret-icon')).toBeNull();
    expect(group.querySelectorAll('ret-icon')).toHaveLength(1);
  });

  it('shows a stored answer and clears on reset', async () => {
    const { control, fixture } = await renderYesNo();
    control.setValue({ value: false });
    await fixture.whenStable();
    expect(radio('No').checked).toBe(true);
    control.reset();
    await fixture.whenStable();
    expect(radio('No').checked).toBe(false);
  });

  it('is one tab stop and arrow keys change the answer', async () => {
    const { control } = await renderYesNo();
    const user = userEvent.setup();
    await user.tab();
    expect(document.activeElement).toBe(radio('Yes'));
    await user.keyboard(' ');
    expect(control.value).toEqual({ value: true });
    await user.keyboard('{ArrowRight}');
    expect(control.value).toEqual({ value: false });
    expect(control.touched).toBe(false);
    await user.tab();
    expect(control.touched).toBe(true);
    expect(document.activeElement).not.toBe(radio('Yes'));
  });

  it('uses custom labels such as Still right and Something has changed', async () => {
    const { control, fixture } = await renderYesNo({
      yesLabel: 'Still right',
      noLabel: "Something's changed",
    });
    expect(screen.queryByRole('radio', { name: 'Yes' })).toBeNull();
    await userEvent.setup().click(screen.getByText("Something's changed"));
    expect(control.value).toEqual({ value: false });
    fixture.componentRef.setInput('yesLabel', 'Correct');
    await fixture.whenStable();
    expect(radio('Correct').checked).toBe(false);
    expect(radio("Something's changed").checked).toBe(true);
  });

  it('ties hint and error to the group', async () => {
    const { group } = await renderYesNo({
      hint: 'Including help at home',
      error: 'Choose yes or no',
    });
    const ids = group.getAttribute('aria-describedby')!.split(' ');
    expect(ids.map((id) => document.getElementById(id)?.textContent?.trim())).toEqual([
      'Including help at home',
      'Error: Choose yes or no',
    ]);
    expect(group.dataset['invalid']).toBe('true');
  });

  it('is disabled through the form control and cannot be chosen', async () => {
    const { control, fixture } = await renderYesNo();
    control.disable();
    await fixture.whenStable();
    expect(radio('Yes').matches(':disabled')).toBe(true);
    expect(radio('No').matches(':disabled')).toBe(true);
    await userEvent.setup().click(screen.getByText('Yes'));
    expect(control.value).toBeNull();
  });

  it('moves the check when the stored answer changes after the client picked', async () => {
    const { control, fixture } = await renderYesNo();
    await userEvent.setup().click(screen.getByText('No'));
    control.setValue({ value: true });
    await fixture.whenStable();
    expect(radio('Yes').checked).toBe(true);
    expect(radio('Yes').closest('label')!.querySelector('ret-icon')).not.toBeNull();
    expect(radio('No').closest('label')!.querySelector('ret-icon')).toBeNull();
  });

  it('draws its own card when standalone and none when embedded', async () => {
    const { group, fixture } = await renderYesNo();
    expect(group.dataset['variant']).toBe('standalone');
    fixture.componentRef.setInput('variant', 'embedded');
    await fixture.whenStable();
    expect(group.dataset['variant']).toBe('embedded');
  });

  it('shows an optional leading icon in the question', async () => {
    await render(YesNo, { inputs: { label: 'Any care needs?', icon: 'info' } });
    const legend = screen.getByRole('group', { name: 'Any care needs?' }).querySelector('legend')!;
    expect(legend.querySelector('ret-icon')).not.toBeNull();
  });

  it('reveals a detail box on the chosen answer and sends its text', async () => {
    const { control } = await renderYesNo({
      detail: { when: false, label: 'What is Sarah doing instead?' },
    });
    const user = userEvent.setup();
    await user.click(screen.getByText('Yes'));
    expect(screen.queryByRole('textbox')).toBeNull();
    await user.click(screen.getByText('No'));
    const box = screen.getByRole('textbox', { name: 'What is Sarah doing instead?' });
    expect(document.activeElement).not.toBe(box);
    await user.type(box, 'An apprenticeship');
    expect(control.value).toEqual({ value: false, detail: 'An apprenticeship' });
  });

  it('tells a screen reader that a box has appeared for the answer', async () => {
    await renderYesNo({ detail: { when: false, label: 'What is Sarah doing instead?' } });
    await userEvent.setup().click(screen.getByText('No'));
    const ids = radio('No').getAttribute('aria-describedby')!.split(' ');
    expect(ids.map((id) => document.getElementById(id)?.textContent?.trim())).toContain(
      'What is Sarah doing instead?',
    );
    expect(radio('Yes').hasAttribute('aria-describedby')).toBe(false);
  });

  it('clears the detail when the answer changes, so no stale text is sent', async () => {
    const { control } = await renderYesNo({ detail: { when: false, label: 'Tell us more' } });
    const user = userEvent.setup();
    await user.click(screen.getByText('No'));
    await user.type(screen.getByRole('textbox', { name: 'Tell us more' }), 'Moved to Leeds');
    await user.click(screen.getByText('Yes'));
    expect(control.value).toEqual({ value: true });
    await user.click(screen.getByText('No'));
    expect(
      (screen.getByRole('textbox', { name: 'Tell us more' }) as HTMLTextAreaElement).value,
    ).toBe('');
    expect(control.value).toEqual({ value: false });
  });

  it('shows a stored detail and an error on the box', async () => {
    const { control, fixture } = await renderYesNo({
      detail: { when: true, label: 'Who looks after you?' },
      detailError: 'Tell us who helps you',
    });
    control.setValue({ value: true, detail: 'My daughter' });
    await fixture.whenStable();
    const box = screen.getByRole('textbox', {
      name: 'Who looks after you?',
    }) as HTMLTextAreaElement;
    expect(box.value).toBe('My daughter');
    expect(box.getAttribute('aria-invalid')).toBe('true');
    const ids = box.getAttribute('aria-describedby')!.split(' ');
    expect(
      ids.map((id) => document.getElementById(id)?.textContent?.replace(/\s+/g, ' ').trim()),
    ).toContain('Error: Tell us who helps you');
  });

  it('gives each pair its own radio name', async () => {
    await render(`<ret-yes-no label="A" /><ret-yes-no label="B" />`, { imports: [YesNo] });
    const [a, b] = screen.getAllByRole('group');
    expect(within(a).getAllByRole('radio')[0].getAttribute('name')).not.toBe(
      within(b).getAllByRole('radio')[0].getAttribute('name'),
    );
  });
});
