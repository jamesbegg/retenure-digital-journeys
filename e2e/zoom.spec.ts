import { expect, test } from '@playwright/test';
import { reflowProblems, open, setTextSize200 } from './fixtures/checks';
import { journeyPages, reachPage } from './fixtures/journey-pages';
import { routes } from './fixtures/routes';

test.use({ viewport: { width: 320, height: 800 } });

for (const route of routes) {
  test(`${route} reflows at 320 px with 200% text`, async ({ page }) => {
    await open(page, route);
    await setTextSize200(page);
    expect(await reflowProblems(page)).toEqual([]);
  });
}

for (const { name, reach } of journeyPages) {
  test(`journey page: ${name} reflows at 320 px with 200% text`, async ({ page }) => {
    await reachPage(page, reach);
    await setTextSize200(page);
    expect(await reflowProblems(page)).toEqual([]);
  });
}
