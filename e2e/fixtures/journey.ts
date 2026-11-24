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
