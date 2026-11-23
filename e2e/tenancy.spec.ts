import { expect, test } from '@playwright/test';
import { firms } from './fixtures/firms';
import { heading, startUrl, verify } from './fixtures/journey';

const colours: Record<string, string> = {
  'hartwell.localhost': '#1d4d4f',
  'northgate.localhost': '#5b2a86',
};

for (const firm of firms) {
  const others = firms.filter((f) => f !== firm);

  test(`${firm.host} shows ${firm.name}, its colours, and no other firm`, async ({ page }) => {
    await page.goto(startUrl('happy', firm));
    await expect(page.locator('ret-client-header')).toContainText(firm.name);
    await expect(page).toHaveTitle(firm.name);
    const brand = () =>
      page.evaluate(() =>
        document.documentElement.style.getPropertyValue('--ret-brand-primary').trim(),
      );
    expect(await brand()).toBe(colours[firm.host]);

    await verify(page, 'happy', firm);
    await expect(heading(page)).toHaveText('Your annual check-in');
    const body = page.locator('body');
    await expect(body).toContainText(firm.name);
    for (const other of others) {
      await expect(body).not.toContainText(other.name);
      await expect(page).not.toHaveTitle(other.name);
      expect(await brand()).not.toBe(colours[other.host]);
    }
  });

  test(`${firm.host} error page names no firm at all`, async ({ page }) => {
    await page.goto(startUrl('serverError', firm));
    await expect(heading(page)).toHaveText('Something went wrong');
    for (const name of firms.map((f) => f.name)) {
      await expect(page.locator('body')).not.toContainText(name);
    }
    expect(
      await page.evaluate(() =>
        document.documentElement.style.getPropertyValue('--ret-brand-primary'),
      ),
    ).toBe('');
  });
}
