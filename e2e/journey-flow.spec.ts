import { expect, test } from '@playwright/test';
import { firms } from './fixtures/firms';
import { answerEverything, heading, sampleSections, verify } from './fixtures/journey';

for (const firm of firms) {
  test(`${firm.name}: date of birth, every section, review, send, done`, async ({ page }) => {
    await verify(page, 'happy', firm);
    await expect(heading(page)).toHaveText('Your annual check-in');
    await page.getByRole('button', { name: 'Continue' }).click();
    await answerEverything(page);

    const review = page.getByRole('main');
    for (const { title } of sampleSections) {
      await expect(review.getByRole('heading', { level: 2, name: title })).toBeVisible();
    }
    await expect(review.getByText('We may move.')).toBeVisible();
    await page.getByRole('button', { name: /^Send to / }).click();

    await expect(heading(page)).toHaveText("Thank you. We've received your answers.");
    await expect(page.getByText(/will be in touch\./)).toBeVisible();
  });
}
