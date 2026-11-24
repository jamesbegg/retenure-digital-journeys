import { Page } from '@playwright/test';

export interface Firm {
  name: string;
  host: string;
}

export interface JourneyPage {
  name: string;
  reach: (page: Page) => Promise<void>;
}
