import { Page } from '@playwright/test';
import { JourneyPage } from '../interfaces/journey';
import { answerEverything, startUrl, typeDate, verify } from './journey';

// Each page of the journey, reached the way a client reaches it, through the dev mock.
export const journeyPages: JourneyPage[] = [
  { name: 'verify', reach: (page) => page.goto(startUrl()).then(() => undefined) },
  {
    name: 'verify after a wrong date',
    reach: async (page) => {
      await page.goto(startUrl('wrongDob'));
      await typeDate(page, { day: '14', month: '03', year: '1978' });
      await page.getByRole('button', { name: 'Confirm' }).click();
      await page.getByText("That date doesn't match").waitFor();
    },
  },
  {
    name: 'link problem',
    reach: (page) => page.goto('/start').then(() => undefined),
  },
  { name: 'locked', reach: (page) => verify(page, 'locked') },
  { name: 'link reissued', reach: (page) => verify(page, 'linkReissued') },
  { name: 'link requested', reach: (page) => verify(page, 'linkRequested') },
  { name: 'already completed', reach: (page) => verify(page, 'alreadyCompleted') },
  { name: 'expired', reach: (page) => verify(page, 'expired') },
  {
    name: 'error',
    reach: (page) => page.goto(startUrl('serverError')).then(() => undefined),
  },
  { name: 'welcome', reach: (page) => verify(page) },
  {
    name: 'section',
    reach: async (page) => {
      await verify(page);
      await page.getByRole('button', { name: 'Continue' }).click();
      await page.getByRole('radio', { name: 'Yes' }).check({ force: true });
      await page.getByLabel('What is your yearly pay at your new job?').fill('52000');
    },
  },
  {
    name: 'review',
    reach: async (page) => {
      await verify(page);
      await page.getByRole('button', { name: 'Continue' }).click();
      await answerEverything(page);
    },
  },
  {
    name: 'done',
    reach: async (page) => {
      await verify(page);
      await page.getByRole('button', { name: 'Continue' }).click();
      await answerEverything(page);
      await page.getByRole('button', { name: /^Send to / }).click();
    },
  },
];

export async function reachPage(page: Page, reach: (page: Page) => Promise<void>) {
  await reach(page);
  await page.getByRole('heading', { level: 1 }).waitFor();
}
