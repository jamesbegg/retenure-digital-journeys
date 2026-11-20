import { render, screen } from '@testing-library/angular';
import { Check, Mail } from 'lucide';
import { Icon } from './icon';

const paths = (host: Element) => [...host.querySelectorAll('path')].map((p) => p.getAttribute('d'));

describe('Icon', () => {
  it('hides a decorative icon from assistive technology', async () => {
    const { container } = await render(Icon, { inputs: { name: 'check' } });
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('names a meaningful icon', async () => {
    await render(Icon, { inputs: { name: 'circle-check', label: 'Saved' } });
    const img = screen.getByRole('img', { name: 'Saved' });
    expect(img.getAttribute('aria-hidden')).toBeNull();
  });

  it('treats a blank label as decorative', async () => {
    await render(Icon, { inputs: { name: 'check', label: '  ' } });
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('draws the named Lucide icon and redraws when the name changes', async () => {
    const { container, fixture } = await render(Icon, { inputs: { name: 'check' } });
    expect(paths(container)).toEqual(Check.map(([, attrs]) => attrs['d']));
    expect(container.querySelector('path')!.namespaceURI).toBe('http://www.w3.org/2000/svg');
    fixture.componentRef.setInput('name', 'mail');
    await fixture.whenStable();
    expect(container.querySelectorAll('svg > *')).toHaveLength(Mail.length);
    expect(paths(container)).not.toContain(Check[0][1]['d']);
  });

  it('applies size and tone', async () => {
    const { fixture } = await render(Icon, {
      inputs: { name: 'circle-alert', size: 'lg', tone: 'danger' },
    });
    const host: HTMLElement = fixture.nativeElement;
    expect(host.classList).toContain('lg');
    expect(host.classList).toContain('danger');
  });

  it('defaults to medium and the current text colour', async () => {
    const { fixture } = await render(Icon, { inputs: { name: 'info' } });
    expect([...(fixture.nativeElement as HTMLElement).classList]).toEqual(
      expect.arrayContaining(['md', 'current']),
    );
  });
});
