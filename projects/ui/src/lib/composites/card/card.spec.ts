import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { Card } from './card';

function renderCard(attrs = '') {
  return render(`<ret-card heading="Your goals" ${attrs}><p>Retire at 60</p></ret-card>`, {
    imports: [Card],
  });
}

const card = () => screen.getByRole('group', { name: 'Your goals' });

describe('Card', () => {
  it('groups projected content under its h2 heading', async () => {
    await renderCard();
    within(card()).getByRole('heading', { level: 2, name: 'Your goals' });
    within(card()).getByText('Retire at 60');
    expect(card().hasAttribute('aria-current')).toBe(false);
    expect(within(card()).queryByRole('img')).toBeNull();
  });

  it('uses the heading level it is given', async () => {
    await renderCard('[headingLevel]="3"');
    within(card()).getByRole('heading', { level: 3, name: 'Your goals' });
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull();
  });

  it('supports a level 4 heading for nested content', async () => {
    await renderCard('[headingLevel]="4"');
    within(card()).getByRole('heading', { level: 4, name: 'Your goals' });
  });

  it('is a plain container without a heading', async () => {
    await render(`<ret-card><p>Retire at 60</p></ret-card>`, { imports: [Card] });
    expect(screen.queryByRole('group')).toBeNull();
    screen.getByText('Retire at 60');
  });

  it('marks the active card as current, not by colour alone', async () => {
    await renderCard('variant="active"');
    expect(card().getAttribute('aria-current')).toBe('true');
    expect(card().classList).toContain('active');
  });

  it('collapses an answered card to its summary with an Edit button', async () => {
    const edit = vi.fn();
    await render(
      `<ret-card heading="Your goals" variant="answered" editLabel="Change" (edit)="edit()">
        <p slot="summary">Retire at 60</p>
        <p>Question form</p>
      </ret-card>`,
      { imports: [Card], componentProperties: { edit } },
    );
    within(card()).getByText('Retire at 60');
    expect(screen.queryByText('Question form')).toBeNull();
    within(card()).getByRole('img', { name: 'Answered' });
    await userEvent.setup().click(within(card()).getByRole('button', { name: 'Change' }));
    expect(edit).toHaveBeenCalledTimes(1);
  });

  it('describes each Edit button by its card heading', async () => {
    await render(
      `<ret-card heading="Your goals" variant="answered"><p slot="summary">Retire at 60</p></ret-card>`,
      { imports: [Card] },
    );
    const button = within(card()).getByRole('button', { name: 'Edit' });
    const description = document.getElementById(button.getAttribute('aria-describedby')!);
    expect(description?.textContent).toBe('Your goals');
  });

  it('defaults the edit label to Edit', async () => {
    await render(
      `<ret-card heading="Your goals" variant="answered"><p slot="summary">Retire at 60</p></ret-card>`,
      { imports: [Card] },
    );
    within(card()).getByRole('button', { name: 'Edit' });
  });

  it('uses the muted surface', async () => {
    await renderCard('variant="muted"');
    expect(card().classList).toContain('muted');
    within(card()).getByText('Retire at 60');
  });

  it('keeps a disabled card readable but its Edit unreachable', async () => {
    const edit = vi.fn();
    await render(
      `<ret-card heading="Your goals" variant="answered" [disabled]="true" (edit)="edit()" ><p slot="summary">Retire at 60</p></ret-card>`,
      { imports: [Card], componentProperties: { edit } },
    );
    within(card()).getByText('Retire at 60');
    const button = within(card()).getByRole('button', { name: 'Edit' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    const user = userEvent.setup();
    await user.click(button);
    await user.tab();
    expect(document.activeElement).not.toBe(button);
    expect(edit).not.toHaveBeenCalled();
  });

  it('emits edit from the keyboard', async () => {
    const edit = vi.fn();
    await render(
      `<ret-card heading="Your goals" variant="answered" (edit)="edit()" ><p slot="summary">Retire at 60</p></ret-card>`,
      { imports: [Card], componentProperties: { edit } },
    );
    const user = userEvent.setup();
    await user.tab();
    expect(document.activeElement).toBe(within(card()).getByRole('button', { name: 'Edit' }));
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(edit).toHaveBeenCalledTimes(2);
  });

  async function renderStateful() {
    const { fixture } = await render(
      `<ret-card heading="Your goals" [variant]="variant"><p slot="summary">Retire at 60</p><button>Yes</button></ret-card>`,
      { imports: [Card], componentProperties: { variant: 'answered' } },
    );
    return async (variant: string) => {
      fixture.componentInstance.variant = variant;
      fixture.changeDetectorRef.markForCheck();
      await fixture.whenStable();
    };
  }

  it('reopens the question and moves focus to the heading when Edit is pressed', async () => {
    const setVariant = await renderStateful();
    within(card()).getByRole('button', { name: 'Edit' }).focus();
    await setVariant('active');
    expect(screen.queryByText('Retire at 60')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    within(card()).getByRole('button', { name: 'Yes' });
    expect(card().getAttribute('aria-current')).toBe('true');
    expect(document.activeElement).toBe(
      within(card()).getByRole('heading', { name: 'Your goals' }),
    );
  });

  it('moves lost focus to Edit when the card collapses to answered', async () => {
    const setVariant = await renderStateful();
    await setVariant('active');
    within(card()).getByRole('button', { name: 'Yes' }).focus();
    await setVariant('answered');
    expect(document.activeElement).toBe(within(card()).getByRole('button', { name: 'Edit' }));
  });

  it('keeps the summary and Edit when answered at level 3 or with no heading', async () => {
    await render(
      `<ret-card heading="Your goals" [headingLevel]="3" variant="answered" ><p slot="summary">Retire at 60</p></ret-card>
       <ret-card variant="answered" ><p slot="summary">Help with a first home</p></ret-card>`,
      { imports: [Card] },
    );
    within(card()).getByRole('heading', { level: 3, name: 'Your goals' });
    within(card()).getByText('Retire at 60');
    screen.getByText('Help with a first home');
    expect(screen.getAllByRole('button', { name: 'Edit' })).toHaveLength(2);
  });

  it('gives each card its own heading id', async () => {
    await render(`<ret-card heading="A" /><ret-card heading="B" />`, { imports: [Card] });
    const [a, b] = screen.getAllByRole('group');
    expect(a.getAttribute('aria-labelledby')).not.toBe(b.getAttribute('aria-labelledby'));
  });
});
