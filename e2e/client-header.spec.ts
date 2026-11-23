import { expect, test } from '@playwright/test';
import { open, setTextSize200 } from './fixtures/checks';

test.use({ viewport: { width: 320, height: 800 } });

test('a header with progress keeps every word whole at 320 px with 200% text', async ({ page }) => {
  await open(page, '/gallery/client-header');
  await setTextSize200(page);
  // With wrapping inside words switched off, a word that does not fit overflows its box.
  await page.addStyleTag({ content: '* { overflow-wrap: normal !important; }' });
  const overflowing = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('ret-client-header *')]
      .filter((el) => el.scrollWidth > el.clientWidth + 1)
      .map((el) => el.outerHTML.slice(0, 120)),
  );
  expect(overflowing).toEqual([]);
});
