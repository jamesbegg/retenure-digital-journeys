import AxeBuilder from '@axe-core/playwright';
import { Page } from '@playwright/test';

export async function blockingAxeViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  return violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.help}`);
}

export async function open(page: Page, route: string) {
  await page.goto(route);
  await page.locator('main').first().waitFor();
}

export async function setTextSize200(page: Page) {
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
}

export function reflowProblems(page: Page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const clips = (o: string) => o === 'hidden' || o === 'clip';
    const clipped = [...document.querySelectorAll<HTMLElement>('body *')].filter((el) => {
      if (el.closest('.ret-visually-hidden')) return false;
      const { overflowX, overflowY } = getComputedStyle(el);
      const scrollsOwnLine = el.matches('input, select');
      return (
        (!scrollsOwnLine && clips(overflowX) && el.scrollWidth > el.clientWidth + 1) ||
        (clips(overflowY) && el.scrollHeight > el.clientHeight + 1)
      );
    });
    return [
      ...(root.scrollWidth > root.clientWidth ? ['horizontal scroll'] : []),
      ...clipped.map((el) => `clipped: ${el.outerHTML.slice(0, 120)}`),
    ];
  });
}
