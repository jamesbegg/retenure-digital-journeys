import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { Button } from './button';

const button = (name: string) => screen.getByRole('button', { name });
const parts = (el: HTMLElement) =>
  [...el.querySelector('.content')!.children].map((c) =>
    c.tagName === 'RET-ICON' ? 'icon' : c.textContent,
  );

describe('Button', () => {
  it('renders a native button named by its label, defaulting to a large primary', async () => {
    await render(Button, { inputs: { label: 'Continue' } });
    const el = button('Continue');
    expect(el.getAttribute('type')).toBe('button');
    expect([...el.classList]).toEqual(expect.arrayContaining(['primary', 'lg']));
  });

  for (const variant of ['primary', 'secondary', 'ghost', 'danger', 'link'] as const) {
    it(`applies the ${variant} variant`, async () => {
      await render(Button, { inputs: { label: 'Save', variant, size: 'md' } });
      expect([...button('Save').classList]).toEqual(expect.arrayContaining([variant, 'md']));
    });
  }

  it('emits pressed on click, Enter and Space', async () => {
    const pressed = vi.fn();
    await render(Button, { inputs: { label: 'Continue' }, on: { pressed } });
    const user = userEvent.setup();
    await user.click(button('Continue'));
    expect(document.activeElement).toBe(button('Continue'));
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(pressed).toHaveBeenCalledTimes(3);
  });

  it('submits its form when type is submit', async () => {
    const submit = vi.fn((e: Event) => e.preventDefault());
    const { container } = await render(`<form><ret-button label="Save" type="submit" /></form>`, {
      imports: [Button],
    });
    container.querySelector('form')!.addEventListener('submit', submit);
    await userEvent.setup().click(button('Save'));
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('places a leading icon before the label and a trailing icon after it', async () => {
    const { rerender } = await render(Button, { inputs: { label: 'Back', icon: 'arrow-left' } });
    expect(parts(button('Back'))).toEqual(['icon', 'Back']);
    await rerender({ inputs: { label: 'Next', icon: 'arrow-right', iconPosition: 'trailing' } });
    expect(parts(button('Next'))).toEqual(['Next', 'icon']);
  });

  it('names an icon-only button by its label and shows no text', async () => {
    await render(Button, {
      inputs: { label: 'Edit your plans', icon: 'pencil', iconPosition: 'only' },
    });
    const el = button('Edit your plans');
    expect(parts(el)).toEqual(['icon']);
    expect(el.textContent?.trim()).toBe('');
    expect(el.querySelector('ret-icon svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('takes a description from another element', async () => {
    await render(`<h2 id="goals">Your goals</h2><ret-button label="Edit" describedBy="goals" />`, {
      imports: [Button],
    });
    expect(button('Edit').getAttribute('aria-describedby')).toBe('goals');
  });

  it('is natively disabled and does not emit', async () => {
    const pressed = vi.fn();
    await render(Button, { inputs: { label: 'Continue', disabled: true }, on: { pressed } });
    const el = button('Continue') as HTMLButtonElement;
    expect(el.disabled).toBe(true);
    await userEvent.setup().click(el);
    expect(pressed).not.toHaveBeenCalled();
  });

  it('stops a click from reaching outer listeners while pending', async () => {
    const outer = vi.fn();
    await render(`<div (click)="outer()"><ret-button label="Save" [pending]="true" /></div>`, {
      imports: [Button],
      componentProperties: { outer },
    });
    await userEvent.setup().click(button('Save'));
    expect(outer).not.toHaveBeenCalled();
  });

  it('stays focusable while pending, announces progress and blocks a double submit', async () => {
    const pressed = vi.fn();
    const submit = vi.fn((e: Event) => e.preventDefault());
    const { container } = await render(
      `<form><ret-button label="Save" type="submit" [pending]="true" pendingLabel="Saving your answers" (pressed)="pressed()" /></form>`,
      { imports: [Button], componentProperties: { pressed } },
    );
    container.querySelector('form')!.addEventListener('submit', submit);
    const el = button('Save');
    expect(el.getAttribute('aria-disabled')).toBe('true');
    expect((el as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByRole('status').textContent).toBe('Saving your answers');
    expect(el.querySelector('ret-icon.spinner')).not.toBeNull();
    const user = userEvent.setup();
    await user.click(el);
    await user.click(el);
    expect(pressed).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
  });

  it('returns to normal when pending ends', async () => {
    const pressed = vi.fn();
    const { fixture } = await render(Button, {
      inputs: { label: 'Next', icon: 'arrow-right', iconPosition: 'trailing', pending: true },
      on: { pressed },
    });
    const el = button('Next');
    expect(parts(el)).toEqual(['icon', 'Next']);
    expect(el.querySelector('ret-icon.spinner')).not.toBeNull();
    fixture.componentRef.setInput('pending', false);
    await fixture.whenStable();
    expect(screen.getByRole('status').textContent).toBe('');
    expect(el.hasAttribute('aria-disabled')).toBe(false);
    expect(el.querySelector('ret-icon.spinner')).toBeNull();
    expect(parts(el)).toEqual(['Next', 'icon']);
    await userEvent.setup().click(el);
    expect(pressed).toHaveBeenCalledTimes(1);
  });

  it('ignores Enter and Space while pending', async () => {
    const pressed = vi.fn();
    await render(Button, { inputs: { label: 'Save', pending: true }, on: { pressed } });
    button('Save').focus();
    const user = userEvent.setup();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(pressed).not.toHaveBeenCalled();
  });

  it('does not emit when both disabled and pending', async () => {
    const pressed = vi.fn();
    await render(Button, {
      inputs: { label: 'Save', pending: true, disabled: true },
      on: { pressed },
    });
    await userEvent.setup().click(button('Save'));
    expect(pressed).not.toHaveBeenCalled();
  });

  it('submits a form elsewhere on the page through the form attribute', async () => {
    const submitted = vi.fn((event: Event) => event.preventDefault());
    const form = document.createElement('form');
    form.id = 'ask';
    form.addEventListener('submit', submitted);
    document.body.append(form);
    await render(Button, { inputs: { label: 'Send', type: 'submit', form: 'ask' } });
    await userEvent.setup().click(button('Send'));
    expect(submitted).toHaveBeenCalledTimes(1);
    form.remove();
  });
});
