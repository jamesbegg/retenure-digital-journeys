import { expect, test } from '@playwright/test';
import { blockingAxeViolations, open, setTextSize200 } from './fixtures/checks';
import { routes } from './fixtures/routes';

for (const route of routes) {
  test(`${route} has no serious or critical axe violations`, async ({ page }) => {
    await open(page, route);
    expect(await blockingAxeViolations(page)).toEqual([]);
    await setTextSize200(page);
    expect(await blockingAxeViolations(page)).toEqual([]);
  });
}
