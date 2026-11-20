import { expect, test } from '@playwright/test';
import { blockingAxeViolations, reflowProblems, setTextSize200 } from './fixtures/checks';

test.use({ viewport: { width: 320, height: 800 } });

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await setTextSize200(page);
});

const inject = (page: import('@playwright/test').Page, html: string) =>
  page.evaluate((h) => document.body.insertAdjacentHTML('beforeend', h), html);

test('the reflow check catches horizontal scroll', async ({ page }) => {
  await inject(page, '<p style="width: 30rem">Wide</p>');
  expect(await reflowProblems(page)).toContain('horizontal scroll');
});

test('the reflow check catches clipped text', async ({ page }) => {
  await inject(page, '<p style="height: 1rem; overflow: hidden">Two<br>lines</p>');
  expect((await reflowProblems(page)).some((p) => p.startsWith('clipped'))).toBe(true);
});

test('the axe check catches a button with no name', async ({ page }) => {
  await inject(page, '<button></button>');
  expect(await blockingAxeViolations(page)).toContainEqual(expect.stringMatching(/^button-name/));
});

test('both checks pass content that fits and is named', async ({ page }) => {
  await inject(page, '<p style="width: 9rem">Fits</p><button>Continue</button>');
  expect(await reflowProblems(page)).toEqual([]);
  expect(await blockingAxeViolations(page)).toEqual([]);
});
