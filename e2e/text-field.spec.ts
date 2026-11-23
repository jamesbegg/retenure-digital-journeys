import { expect, test } from '@playwright/test';
import { open } from './fixtures/checks';

test('the pound sign sits inside the amount box, so one border and one focus ring surround both', async ({
  page,
}) => {
  await open(page, '/gallery/text-field');
  const field = page.locator('ret-text-field', { hasText: 'What is your yearly pay?' });
  const input = field.getByRole('textbox');
  await input.fill('52000');
  const sign = (await field.locator('.prefix').boundingBox())!;
  const box = (await input.boundingBox())!;
  expect(sign.x).toBeGreaterThan(box.x);
  expect(sign.x + sign.width).toBeLessThan(box.x + box.width);
  // A gap between the sign and the amount.
  const gap = await input.evaluate(
    (el, signRight) =>
      el.getBoundingClientRect().x + parseFloat(getComputedStyle(el).paddingLeft) - signRight,
    sign.x + sign.width,
  );
  expect(gap).toBeGreaterThanOrEqual(4);
  await input.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  expect(await input.evaluate((el) => getComputedStyle(el).outlineWidth)).toBe('3px');
  const wrapper = field.locator('.control');
  expect(await wrapper.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('none');
});
