import { expect, test } from '@playwright/test';
import { startUrl, typeDate, verify } from './fixtures/journey';

const heading = (page: import('@playwright/test').Page) => page.getByRole('heading', { level: 1 });

test('opening the address with no link in it asks for the email link again', async ({ page }) => {
  await page.goto('/start');
  await expect(heading(page)).toHaveText('Please open the link in your email again');
  await page.goto('/check-in/welcome');
  await expect(heading(page)).toHaveText('Please open the link in your email again');
});

test('the token leaves the address bar and a wrong date shows the notice', async ({ page }) => {
  await page.goto(startUrl('wrongDob'));
  expect(page.url()).not.toContain('synthetic-token');
  await typeDate(page, { day: '14', month: '03', year: '1978' });
  await page.getByRole('button', { name: 'Confirm' }).click();
  await expect(page.getByText("That date doesn't match")).toBeVisible();
  await expect(page.locator('ret-notice')).toBeFocused();
  await typeDate(page);
  await page.getByRole('button', { name: 'Confirm' }).click();
  await expect(heading(page)).toHaveText('Your annual check-in');
});

test('an empty or half-filled date is caught before anything is sent', async ({ page }) => {
  await page.goto('/start#t=synthetic-token');
  await page.getByRole('button', { name: 'Confirm' }).click();
  await expect(page.getByText(/Error: Enter your date of birth/)).toBeVisible();
  await page.getByLabel('Day').fill('17');
  await page.getByRole('button', { name: 'Confirm' }).click();
  await expect(page.getByText(/Error: Enter a day, month and year/)).toBeVisible();
});

test('a whole date pasted into one box fills all three', async ({ page }) => {
  await page.goto('/start#t=synthetic-token');
  await page.getByLabel('Day').focus();
  await page.evaluate(() => {
    const data = new DataTransfer();
    data.setData('text', '17/04/1983');
    document.activeElement?.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
    );
  });
  await expect(page.getByLabel('Day')).toHaveValue('17');
  await expect(page.getByLabel('Month')).toHaveValue('04');
  await expect(page.getByLabel('Year')).toHaveValue('1983');
  await page.getByRole('button', { name: 'Confirm' }).click();
  await expect(heading(page)).toHaveText('Your annual check-in');
});

const pages = [
  ['locked', "We've paused this check-in"],
  ['linkReissued', 'A new link is on its way'],
  ['alreadyCompleted', 'This check-in has already been completed'],
  ['expired', 'This check-in link has expired'],
] as const;

for (const [mock, title] of pages) {
  test(`${mock} shows its own page`, async ({ page }) => {
    await verify(page, mock);
    await expect(heading(page)).toHaveText(title);
  });
}

test('an expired or completed check-in names the adviser and how to reach them', async ({
  page,
}) => {
  await verify(page, 'expired');
  await expect(page.getByRole('group', { name: 'Your adviser' })).toContainText(
    'Rather talk it through?',
  );
  await expect(page.getByRole('link', { name: /Email Helen/ })).toBeVisible();
});

test('focus moves to the heading when the page changes', async ({ page }) => {
  await verify(page);
  await expect(heading(page)).toHaveText('Your annual check-in');
  await expect(heading(page)).toBeFocused();
});

test('when verifying again returns to the form with no notice, focus is on the heading', async ({
  page,
}) => {
  await page.goto(startUrl('sessionExpired'));
  await typeDate(page);
  await page.getByRole('button', { name: 'Confirm' }).click();
  await expect(heading(page)).toHaveText('Welcome to your check-in');
  await expect(heading(page)).toBeFocused();
});
