import { expect, test } from '@playwright/test';
import { open } from './fixtures/checks';

test('a money field is one bordered control, with the pound sign inside it', async ({ page }) => {
  await open(page, '/gallery/text-field');
  const widths = await page
    .locator('ret-text-field', { hasText: 'What is your yearly pay?' })
    .evaluate((host) => {
      const border = (selector: string) =>
        getComputedStyle(host.querySelector(selector)!).borderLeftWidth;
      return { control: border('.control'), prefix: border('.prefix'), input: border('.input') };
    });
  expect(widths).toEqual({ control: '2px', prefix: '0px', input: '0px' });
});
