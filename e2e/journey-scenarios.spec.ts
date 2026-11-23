import { expect, Page, test } from '@playwright/test';
import {
  answerEverything,
  answerSection,
  heading,
  startUrl,
  typeDate,
  verify,
} from './fixtures/journey';

const mockLog = (page: Page) => {
  const lines: string[] = [];
  page.on('console', (message) => {
    if (message.text().startsWith('[ret-dev-mock]')) lines.push(message.text());
  });
  return lines;
};
const done = "Thank you. We've received your answers.";
const confirm = (page: Page) => page.getByRole('button', { name: 'Confirm' }).click();

test('sessionExpired: the client verifies again and carries on', async ({ page }) => {
  await verify(page, 'sessionExpired');
  await expect(heading(page)).toHaveText('Welcome to your check-in');
  await typeDate(page);
  await confirm(page);
  await expect(heading(page)).toHaveText('Your annual check-in');
});

test('lostSubmit: the answer is lost, the client verifies again and reaches Done', async ({
  page,
}) => {
  const log = mockLog(page);
  await verify(page, 'lostSubmit');
  await page.getByRole('button', { name: 'Continue' }).click();
  await answerEverything(page);
  await page.getByRole('button', { name: /^Send to / }).click();
  await expect(heading(page)).toHaveText('Welcome to your check-in');
  await typeDate(page);
  await confirm(page);
  await expect(heading(page)).toHaveText(done);
  expect(log.filter((line) => line.includes('submission '))).toHaveLength(1);
});

test('a lapsed session returns to the same section with the answers kept', async ({ page }) => {
  await page.clock.install();
  await verify(page);
  await page.getByRole('button', { name: 'Continue' }).click();
  await answerSection(page, 0);
  await expect(heading(page)).toHaveText('Your family');
  await page.clock.fastForward('31:00');
  await expect(heading(page)).toHaveText('Welcome to your check-in');
  await typeDate(page);
  await confirm(page);
  await expect(heading(page)).toHaveText('Your family');
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByRole('radio', { name: 'Yes' })).toBeChecked();
  await expect(page.getByLabel('What is your yearly pay at your new job?')).toHaveValue('52,000');
});

test('the idle warning waits for 28 minutes, and More time renews the session', async ({
  page,
}) => {
  await page.clock.install();
  const log = mockLog(page);
  await verify(page);
  const warning = page.getByRole('dialog', {
    name: "You've been inactive. Do you need more time?",
  });
  await page.clock.fastForward('27:00');
  await expect(warning).toHaveCount(0);
  await page.clock.fastForward('01:00');
  await expect(warning).toBeVisible();
  await warning.getByRole('button', { name: 'I need more time' }).click();
  await expect(warning).toBeHidden();
  expect(log.filter((line) => line.includes('session renewed'))).toHaveLength(1);
  // Past the original 30 minutes, the renewed session keeps the client in the journey.
  await page.clock.fastForward('05:00');
  await expect(heading(page)).toHaveText('Your annual check-in');
});

test('Make a change on Check your answers goes back to that section', async ({ page }) => {
  await verify(page);
  await page.getByRole('button', { name: 'Continue' }).click();
  await answerEverything(page);
  const card = page.getByRole('region', { name: 'Your family' });
  await card.getByRole('button', { name: 'Make a change' }).click();
  await expect(heading(page)).toHaveText('Your family');
  await expect(page.getByRole('radio', { name: 'Dev' })).toBeChecked();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(heading(page)).toHaveText('Spending');
});

test('an unknown section starts at the first, after verifying', async ({ page }) => {
  await page.goto(startUrl().replace('/start', '/check-in/section/nope'));
  await expect(heading(page)).toHaveText('Welcome to your check-in');
  await typeDate(page);
  await confirm(page);
  await expect(heading(page)).toHaveText('Your income');
});

test('Back after Done stays on Done', async ({ page }) => {
  await verify(page);
  await page.getByRole('button', { name: 'Continue' }).click();
  await answerEverything(page);
  await page.getByRole('button', { name: /^Send to / }).click();
  await expect(heading(page)).toHaveText(done);
  await page.goBack();
  await expect(heading(page)).toHaveText(done);
  await expect(page).toHaveURL(/\/check-in\/done$/);
  await expect(page.getByRole('heading', { name: 'Check your answers' })).toHaveCount(0);
});
