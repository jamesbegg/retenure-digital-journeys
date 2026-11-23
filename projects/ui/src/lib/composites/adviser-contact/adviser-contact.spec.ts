import { render, screen } from '@testing-library/angular';
import { AdviserContact } from './adviser-contact';

const inputs = {
  name: 'Helen Marsh',
  initials: 'HM',
  jobTitle: 'Your financial adviser, Hartwell Wealth Planning',
  email: 'helen.marsh@hartwell.example',
  phone: '0113 496 0123',
  contactLine: "Rather talk it through? Email me and we'll arrange a call.",
  emailLabel: 'Email Helen',
};

describe('AdviserContact', () => {
  it('shows who the adviser is and the contact line, in a named group', async () => {
    await render(AdviserContact, { inputs });
    const group = screen.getByRole('group', { name: 'Your adviser' });
    expect(group.textContent).toContain('Helen Marsh');
    expect(group.textContent).toContain('Your financial adviser, Hartwell Wealth Planning');
    expect(group.textContent).toContain(
      "Rather talk it through? Email me and we'll arrange a call.",
    );
  });

  it('links to mail and tel with whitespace removed from the number', async () => {
    await render(AdviserContact, { inputs });
    expect(screen.getByRole('link', { name: 'Email Helen' }).getAttribute('href')).toBe(
      'mailto:helen.marsh@hartwell.example',
    );
    expect(screen.getByRole('link', { name: '0113 496 0123' }).getAttribute('href')).toBe(
      'tel:01134960123',
    );
  });

  it('leaves out the phone link when there is no number', async () => {
    await render(AdviserContact, { inputs: { ...inputs, phone: undefined } });
    expect(screen.queryByRole('link', { name: /0113/ })).toBeNull();
    screen.getByRole('link', { name: 'Email Helen' });
  });

  it('hides the initials from assistive technology', async () => {
    const { container } = await render(AdviserContact, { inputs });
    expect(container.querySelector('.avatar')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('can be named by the caller', async () => {
    await render(AdviserContact, { inputs: { ...inputs, label: 'Your planner' } });
    screen.getByRole('group', { name: 'Your planner' });
  });

  it('compact shows the contact line and a named email link, without the role or phone', async () => {
    await render(AdviserContact, { inputs: { ...inputs, variant: 'compact' } });
    const group = screen.getByRole('group');
    expect(group.textContent).toContain('Rather talk it through?');
    expect(group.textContent).not.toContain('Your financial adviser');
    expect(screen.getByRole('link', { name: 'Email Helen' }).getAttribute('href')).toBe(
      'mailto:helen.marsh@hartwell.example',
    );
    expect(screen.queryByRole('link', { name: /0113/ })).toBeNull();
  });

  it('reflects the variant on the host', async () => {
    const { fixture } = await render(AdviserContact, { inputs });
    expect((fixture.nativeElement as HTMLElement).dataset['variant']).toBe('full');
  });
});
