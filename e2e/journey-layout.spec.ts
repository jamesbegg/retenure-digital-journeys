import { expect, Page, test } from '@playwright/test';
import { startUrl, verify } from './fixtures/journey';

const heading = (page: Page) => page.getByRole('heading', { level: 1 });

for (const width of [390, 1280]) {
  test(`the header runs edge to edge at ${width} px, with its contents in the column`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(startUrl());
    const box = async () => (await page.locator('ret-client-header').boundingBox())!;
    expect(await box()).toMatchObject({ x: 0, y: 0, width });
    await verify(page);
    await expect(heading(page)).toHaveText('Your annual check-in');
    expect(await box()).toMatchObject({ x: 0, y: 0, width });

    const footer = (await page.locator('footer').boundingBox())!;
    expect(footer).toMatchObject({ x: 0, width });
    const contact = (await page.locator('ret-adviser-contact').boundingBox())!;
    expect(contact.width).toBeLessThanOrEqual(Math.min(width - 32, 640));

    if (width > 768) {
      // The firm name starts where the 40rem column does.
      const firm = (await page.locator('ret-client-header .mark').boundingBox())!;
      const title = (await heading(page).boundingBox())!;
      expect(Math.abs(firm.x - title.x)).toBeLessThanOrEqual(1);
    }
  });
}
