import { expect, Page, test } from '@playwright/test';
import { blockingAxeViolations, open, reflowProblems, setTextSize200 } from './fixtures/checks';

// Focus may leave to the browser's own controls (the body), but never to the page behind.
const staysInDialog = (page: Page) =>
  page.evaluate(
    () =>
      document.activeElement === document.body || !!document.activeElement?.closest('dialog[open]'),
  );

async function openModal(page: Page, tone: 'default' | 'danger') {
  await open(page, '/gallery/modal');
  const opener = page.getByRole('button', { name: `Open: ${tone}` });
  await opener.focus();
  await opener.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  return opener;
}

test('opens as a modal dialog with focus on the primary action', async ({ page }) => {
  await openModal(page, 'default');
  expect(await page.locator('dialog[open]').evaluate((d) => d.matches(':modal'))).toBe(true);
  await expect(page.getByRole('button', { name: 'I need more time' })).toBeFocused();
});

test('starts on the safe action when the primary action is destructive', async ({ page }) => {
  await openModal(page, 'danger');
  await expect(page.getByRole('button', { name: 'Leave' })).toBeFocused();
});

test('keeps Tab and Shift+Tab inside the dialog', async ({ page }) => {
  await openModal(page, 'default');
  for (let i = 0; i < 7; i++) {
    await page.keyboard.press('Tab');
    expect(await staysInDialog(page)).toBe(true);
  }
  for (let i = 0; i < 7; i++) {
    await page.keyboard.press('Shift+Tab');
    expect(await staysInDialog(page)).toBe(true);
  }
});

test('leaves the page behind the dialog unreachable', async ({ page }) => {
  const opener = await openModal(page, 'default');
  await expect(opener.click({ timeout: 1000 })).rejects.toThrow();
});

test('Escape closes it and returns focus to the opener', async ({ page }) => {
  const opener = await openModal(page, 'default');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(opener).toBeFocused();
});

test('Close closes it and returns focus to the opener', async ({ page }) => {
  const opener = await openModal(page, 'default');
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(opener).toBeFocused();
});

test('has no serious axe violations and reflows at 320 px with 200% text', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await openModal(page, 'default');
  await setTextSize200(page);
  expect(await blockingAxeViolations(page)).toEqual([]);
  expect(await reflowProblems(page)).toEqual([]);
  await expect(page.getByRole('button', { name: 'I need more time' })).toBeVisible();
});

test('a sheet rises from the bottom edge on a phone and centres on a desktop', async ({ page }) => {
  const box = async () => (await page.getByRole('dialog').boundingBox())!;
  await page.setViewportSize({ width: 390, height: 800 });
  await open(page, '/gallery/modal');
  await page.getByRole('button', { name: 'Open: sheet' }).click();
  const phone = await box();
  expect(phone.width).toBe(390);
  expect(phone.y + phone.height).toBe(800);
  await page.keyboard.press('Escape');

  await page.setViewportSize({ width: 1200, height: 800 });
  await page.getByRole('button', { name: 'Open: sheet' }).click();
  const desktop = await box();
  expect(desktop.width).toBeLessThan(600);
  expect(desktop.y + desktop.height).toBeLessThan(800);
});
