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

  test('marks the active card with a full-height straight edge', async ({ page }) => {
    const active = page.locator('ret-card section[aria-current="true"]').first();
    const edge = await active.evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        width: parseFloat(style.borderInlineStartWidth),
        startRadius: parseFloat(style.borderStartStartRadius),
        endRadius: parseFloat(style.borderEndStartRadius),
        far: parseFloat(style.borderStartEndRadius),
      };
    });
    expect(edge.width).toBeGreaterThan(0);
    expect(edge.startRadius).toBe(0);
    expect(edge.endRadius).toBe(0);
    expect(edge.far).toBeGreaterThan(0);
  });
});
