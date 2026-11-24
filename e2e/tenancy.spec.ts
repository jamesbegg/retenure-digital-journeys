import { expect, Page, test } from '@playwright/test';
import { firms } from './fixtures/firms';
import { heading, startUrl, verify } from './fixtures/journey';

const colours: Record<string, string> = {
  'hartwell.localhost': '#1d4d4f',
  'northgate.localhost': '#5b2a86',
};

const brand = (page: Page) =>
  page.evaluate(() =>
    document.documentElement.style.getPropertyValue('--ret-brand-primary').trim(),
  );

// Everything a page could hold that names a firm: text, title, colour and what the browser stores.
async function leaks(page: Page, other: (typeof firms)[number]) {
  const found = await page.evaluate(() => ({
    text: document.body.innerText,
    title: document.title,
    stored: [
      ...Object.keys(localStorage),
      ...Object.keys(sessionStorage),
      ...document.cookie.split(';').map((c) => c.split('=')[0].trim()),
    ],
  }));
  const needle = other.host.split('.')[0];
  return [
    found.text.includes(other.name) && 'text',
    found.title.includes(other.name) && 'title',
    found.stored.some((key) => key.toLowerCase().includes(needle)) && 'storage',
    (await brand(page)) === colours[other.host] && 'colour',
  ].filter(Boolean);
}

for (const firm of firms) {
  const other = firms.find((f) => f !== firm)!;

  test(`${firm.host} shows ${firm.name} and its colour, and nothing of ${other.name}`, async ({
    page,
  }) => {
    await page.goto(startUrl('happy', firm));
    await expect(page.locator('ret-client-header')).toContainText(firm.name);
    await expect(page).toHaveTitle(firm.name);
    expect(await brand(page)).toBe(colours[firm.host]);
    expect(await leaks(page, other)).toEqual([]);

    await verify(page, 'happy', firm);
    await expect(heading(page)).toHaveText('Your annual check-in');
    expect(await leaks(page, other)).toEqual([]);
  });

  test(`${other.host} opened after ${firm.host} in one browser shows none of ${firm.name}`, async ({
    page,
  }) => {
    await verify(page, 'happy', firm);
    await expect(heading(page)).toHaveText('Your annual check-in');

    await page.goto(startUrl('happy', other));
    await expect(page.locator('ret-client-header')).toContainText(other.name);
    expect(await leaks(page, firm)).toEqual([]);
    await verify(page, 'happy', other);
    await expect(heading(page)).toHaveText('Your annual check-in');
    expect(await leaks(page, firm)).toEqual([]);
  });

  test(`${firm.host} error page names no firm in its text or title`, async ({ page }) => {
    await page.goto(startUrl('serverError', firm));
    await expect(heading(page)).toHaveText('Something went wrong');
    for (const named of firms) {
      expect(await leaks(page, named)).toEqual([]);
    }
    expect(await brand(page)).toBe('');
  });
}
