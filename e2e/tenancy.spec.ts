import { expect, test } from '@playwright/test';
import { firms } from './fixtures/firms';

for (const firm of firms) {
  const others = firms.filter((f) => f !== firm);

  test.fixme(`${firm.host} shows ${firm.name} and no other firm (needs #3)`, async ({ page }) => {
    await page.goto(`http://${firm.host}:4310/`);
    await expect(page.getByText(firm.name)).toBeVisible();
    for (const other of others) await expect(page.getByText(other.name)).toHaveCount(0);
  });
}
