import { expect, test } from '@playwright/test';
import { blockingAxeViolations, open, setTextSize200 } from './fixtures/checks';
import { journeyPages, reachPage } from './fixtures/journey-pages';
import { routes } from './fixtures/routes';

for (const route of routes) {
  test(`${route} has no serious or critical axe violations`, async ({ page }) => {
    await open(page, route);
    expect(await blockingAxeViolations(page)).toEqual([]);
    await setTextSize200(page);
    expect(await blockingAxeViolations(page)).toEqual([]);
  });
}

for (const { name, reach } of journeyPages) {
  test(`journey page: ${name} has no serious or critical axe violations`, async ({ page }) => {
    await reachPage(page, reach);
    expect(await blockingAxeViolations(page)).toEqual([]);
    await setTextSize200(page);
    expect(await blockingAxeViolations(page)).toEqual([]);
  });
}
