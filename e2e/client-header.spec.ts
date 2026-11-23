import { expect, test } from '@playwright/test';
import { open, setTextSize200 } from './fixtures/checks';

test('Back and progress share a row on a normal phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await open(page, '/gallery/client-header');
  const header = page.locator('ret-client-header').first();
  const back = await header.getByRole('link', { name: 'Back' }).boundingBox();
  const progress = await header.locator('ret-progress-bar').boundingBox();
  expect(back).not.toBeNull();
  expect(progress).not.toBeNull();
  // Side by side: the two boxes overlap vertically and the bar starts to the right of Back.
  expect(progress!.y).toBeLessThan(back!.y + back!.height);
  expect(progress!.y + progress!.height).toBeGreaterThan(back!.y);
  expect(progress!.x).toBeGreaterThan(back!.x + back!.width - 1);
});

test('every word stays whole at 320 px with 200% text', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
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
