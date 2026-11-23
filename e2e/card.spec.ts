import { expect, test } from '@playwright/test';
import { open } from './fixtures/checks';

test.describe('Card', () => {
  test.beforeEach(async ({ page }) => open(page, '/gallery/card'));

  test('indents a plain list so its bullets sit inside the card', async ({ page }) => {
    const list = page.locator('ret-card ul').first();
    const padding = await list.evaluate((el) =>
      parseFloat(getComputedStyle(el).paddingInlineStart),
    );
    expect(padding).toBeGreaterThan(0);
  });

  test('marks the active card with a straight bar, not a border that follows the corners', async ({
    page,
  }) => {
    const active = page.locator('ret-card section[aria-current="true"]').first();
    const border = await active.evaluate((el) =>
      parseFloat(getComputedStyle(el).borderInlineStartWidth),
    );
    const bar = await active.evaluate((el) => {
      const style = getComputedStyle(el, '::before');
      return {
        content: style.content,
        top: parseFloat(style.insetBlockStart),
        radius: parseFloat(getComputedStyle(el).borderStartStartRadius),
      };
    });
    expect(border).toBe(0);
    expect(bar.content).not.toBe('none');
    expect(bar.top).toBeGreaterThanOrEqual(bar.radius);
  });
});
