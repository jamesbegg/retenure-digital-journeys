import { expect, Page } from '@playwright/test';
import { Firm } from '../interfaces/journey';
import { firms } from './firms';

// The dev mock accepts this date of birth only (src/app/dev-mock).
const dateOfBirth = { day: '17', month: '04', year: '1983' };

export function startUrl(mock = 'happy', firm: Firm = firms[0]) {
  return `http://${firm.host}:4310/start?mock=${mock}#t=synthetic-token`;
}

export async function typeDate(page: Page, { day, month, year } = dateOfBirth) {
  await page.getByLabel('Day').fill(day);
  await page.getByLabel('Month').fill(month);
  await page.getByLabel('Year').fill(year);
}

export async function verify(page: Page, mock = 'happy', firm: Firm = firms[0]) {
  await page.goto(startUrl(mock, firm));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Welcome to your check-in');
  await typeDate(page);
  await page.getByRole('button', { name: 'Confirm' }).click();
}

export const heading = (page: Page) => page.getByRole('heading', { level: 1 });

const continueButton = (page: Page) => page.getByRole('button', { name: 'Continue' });

// Answers the backend's sample journey: one section at a time, the way a client would.
export const sampleSections = [
  {
    title: 'Your income',
    answer: async (page: Page) => {
      await page.getByRole('radio', { name: 'Yes' }).check({ force: true });
      await page.getByLabel('What is your yearly pay at your new job?').fill('52000');
    },
  },
  {
    title: 'Your family',
    answer: async (page: Page) => {
      await page.getByRole('radio', { name: 'Dev' }).check({ force: true });
    },
  },
  {
    title: 'Spending',
    answer: async (page: Page) => {
      await typeDate(page, { day: '01', month: '05', year: '2028' });
    },
  },
  {
    title: 'Your goals',
    answer: async (page: Page) => {
      await page.getByRole('button', { name: 'Confirm' }).click();
    },
  },
  {
    title: 'Your contact details',
    answer: async (page: Page) => {
      await page.getByRole('button', { name: 'Confirm' }).click();
    },
  },
  {
    title: 'Anything else',
    answer: async (page: Page) => {
      await page.getByLabel('Is there anything else you want us to know?').fill('We may move.');
    },
  },
];

export async function answerSection(page: Page, index: number) {
  const { title, answer } = sampleSections[index];
  await expect(heading(page)).toHaveText(title);
  await expect(continueButton(page)).toHaveCount(0);
  await answer(page);
  await continueButton(page).click();
}

export async function answerEverything(page: Page) {
  for (let index = 0; index < sampleSections.length; index++) await answerSection(page, index);
  await expect(heading(page)).toHaveText('Check your answers');
}
