import { expect, test } from '@playwright/test';
import {
  answerEverything,
  answerSection,
  heading,
  startUrl,
  typeDate,
  verify,
} from './fixtures/journey';

const done = "Thank you. We've received your answers.";
const confirm = (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: 'Confirm' }).click();

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
  await verify(page, 'lostSubmit');
  await page.getByRole('button', { name: 'Continue' }).click();
  await answerEverything(page);
  await page.getByRole('button', { name: /^Send to / }).click();
  await expect(heading(page)).toHaveText('Welcome to your check-in');
  await typeDate(page);
  await confirm(page);
  await expect(heading(page)).toHaveText(done);
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

test('the idle warning offers more time, and taking it closes the warning', async ({ page }) => {
  await page.clock.install();
  await verify(page);
  await page.clock.fastForward('29:00');
  const warning = page.getByRole('dialog', {
    name: "You've been inactive. Do you need more time?",
  });
  await expect(warning).toBeVisible();
  await warning.getByRole('button', { name: 'I need more time' }).click();
  await expect(warning).toBeHidden();
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
});
