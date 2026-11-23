import { JourneyCopy } from '@retenure/ui';
import { JourneyResponse, VerificationResponse } from '../interfaces/journey';
import { TenantResponse } from '../interfaces/tenant';

// Synthetic firms and households only (docs/agentic-memory.md). Imported by specs, e2e and the dev-only mock, never by production code.

export const hartwellTenant = {
  schemaVersion: 1,
  tenant: {
    tenantId: 'hartwell',
    displayName: 'Hartwell Wealth',
    logo: { src: '/t/hartwell/logo.svg', alt: 'Hartwell Wealth' },
    favicon: '/t/hartwell/favicon.ico',
    colours: {
      light: { primary: '#1d4d4f', onPrimary: '#ffffff' },
      dark: { primary: '#8fd3cf', onPrimary: '#0b2324' },
    },
    font: { family: 'Source Sans 3', src: '/t/hartwell/fonts/source-sans-3.woff2' },
  },
} satisfies TenantResponse;

export const northgateTenant = {
  schemaVersion: 1,
  tenant: {
    tenantId: 'northgate',
    displayName: 'Northgate Planning',
    logo: { src: '/t/northgate/logo.svg', alt: 'Northgate Planning' },
    favicon: '/t/northgate/favicon.ico',
    colours: {
      light: { primary: '#5b2a86', onPrimary: '#ffffff' },
      dark: { primary: '#d4b8f0', onPrimary: '#24113a' },
    },
  },
} satisfies TenantResponse;

export const copy = {
  continue: 'Continue',
  back: 'Back',
  edit: 'Edit',
  submit: 'Send my answers',
  submitting: 'Sending your answers',
  checkAnswersTitle: 'Check your answers',
  required: 'Answer this question to continue',
  errorPrefix: 'Error:',
  dateLabels: { day: 'Day', month: 'Month', year: 'Year' },
  incompleteDate: 'Enter a day, month and year',
  invalidDate: 'Enter a real date',
  stillRight: 'Still right',
  somethingChanged: "Something's changed",
  leaveWarning: 'If you leave, your answers will not be saved',
  timeoutWarning: "You've been inactive. Do you need more time?",
  moreTime: 'I need more time',
  followUpsCleared: 'Answers to the follow-up questions were cleared',
  confirm: 'Confirm',
  makeChange: 'Make a change',
  confirmed: 'Confirmed',
  cancel: 'Cancel',
  save: 'Save',
  factNote: 'Anything I should know?',
  contactLine: "Rather talk it through? Email me and we'll arrange a call.",
  sendTo: 'Send to {adviser}',
  doneTitle: "Thank you, {name}. We've received your answers.",
  doneBody: '{adviser} will be in touch.',
  close: 'Close',
  emailAdviser: 'Email {adviser}',
  adviserLabel: 'Your adviser',
  progressValue: 'Step {step} of {total}',
  moneyUnreadable: 'Enter an amount in pounds, like 250 or 250.50',
} satisfies JourneyCopy;

const hartwellAdviser = { name: 'Helen Hartwell', email: 'helen@hartwell.example' };

export const hartwellOpenJourney = {
  schemaVersion: 1,
  status: 'open',
  journey: {
    id: 'jrn-hartwell-0001',
    type: 'annualCheckIn',
    title: 'Your annual check-in',
    estimatedMinutes: 5,
    copy,
  },
  client: {
    lead: { id: 'per-priya', firstName: 'Priya', role: 'lead' },
    members: [
      { id: 'per-priya', firstName: 'Priya', role: 'lead' },
      { id: 'per-tom', firstName: 'Tom', role: 'partner' },
    ],
  },
  adviser: hartwellAdviser,
  sections: [
    {
      id: 'sec-about-you',
      title: 'About you',
      intro: 'Your answers are sent to Helen when you finish.',
      blocks: [
        {
          type: 'card',
          question: {
            id: 'q-email',
            version: 1,
            personId: 'per-priya',
            kind: 'yesNo',
            prompt: 'Is priya.shah@example.com still the best email for you?',
            required: true,
            detail: { when: false, label: 'What email should Helen use?', required: true },
          },
        },
        {
          type: 'card',
          question: {
            id: 'q-phone',
            version: 1,
            kind: 'yesNo',
            prompt: 'Is 07700 900123 still the best number to reach you?',
            required: false,
            detail: { when: false, label: 'What number should Helen use?', required: false },
          },
        },
        {
          type: 'card',
          question: {
            id: 'q-tom-dob',
            version: 2,
            personId: 'per-tom',
            kind: 'date',
            prompt: "What is Tom's date of birth?",
            required: true,
            validators: [
              {
                rule: 'dateOfBirth',
                minAge: 18,
                messages: {
                  future: 'Date of birth must be in the past',
                  tooYoung: 'Check the year: this makes Tom under 18',
                  tooOld: 'Check the year you entered',
                },
              },
            ],
          },
        },
      ],
    },
    {
      id: 'sec-changes',
      title: 'What has changed',
      blocks: [
        {
          type: 'card',
          question: {
            id: 'q-moved',
            version: 1,
            kind: 'yesNo',
            prompt: 'Have you moved home in the last year?',
            required: true,
          },
        },
        {
          type: 'card',
          question: {
            id: 'q-spending',
            version: 1,
            kind: 'radio',
            prompt: 'How has your monthly spending changed?',
            required: true,
            options: [
              {
                value: 'more',
                label: 'More',
                input: {
                  label: 'About how much more each month?',
                  type: 'money',
                  required: true,
                  validators: [
                    {
                      rule: 'moneyAmount',
                      min: 1,
                      messages: {
                        unreadable: 'Enter an amount like 250 or 250.50',
                        tooLow: 'Enter an amount of at least £1',
                        tooHigh: 'Check the amount you entered',
                      },
                    },
                  ],
                },
              },
              { value: 'same', label: 'About the same' },
              { value: 'less', label: 'Less' },
            ],
          },
        },
        {
          type: 'card',
          question: {
            id: 'q-savings',
            version: 1,
            kind: 'money',
            prompt: 'Roughly how much do you hold in cash savings?',
            hint: 'An estimate is fine',
            required: false,
          },
        },
        {
          type: 'card',
          question: {
            id: 'q-notes',
            version: 1,
            kind: 'text',
            multiline: true,
            prompt: 'Is there anything else Helen should know?',
            required: false,
          },
        },
      ],
    },
  ],
  expiresAt: '2026-11-20T15:30:00.000Z',
} satisfies JourneyResponse;

const northgateAdviser = { name: 'Northgate Planning', email: 'hello@northgate.example' };

export const northgateOpenJourney = {
  schemaVersion: 1,
  status: 'open',
  journey: {
    id: 'jrn-northgate-0001',
    type: 'pulse',
    title: 'A quick check-in',
    estimatedMinutes: 2,
    copy,
  },
  client: {
    lead: { id: 'per-lead', firstName: 'Alex', role: 'lead' },
    members: [{ id: 'per-lead', firstName: 'Alex', role: 'lead' }],
  },
  adviser: northgateAdviser,
  sections: [
    {
      id: 'sec-pulse',
      title: 'Anything new?',
      blocks: [
        {
          type: 'card',
          question: {
            id: 'q-changes',
            version: 1,
            kind: 'yesNo',
            prompt: 'Has anything changed that your adviser should know about?',
            required: true,
          },
        },
      ],
    },
  ],
  expiresAt: '2026-11-20T15:30:00.000Z',
} satisfies JourneyResponse;

export const hartwellSubmittedJourney = {
  schemaVersion: 1,
  status: 'submitted',
  journeyId: 'jrn-hartwell-0001',
  adviser: hartwellAdviser,
  submittedAt: '2026-11-19T10:12:00.000Z',
  submissionId: '6f1c2c4e-8a43-4d4f-9b7a-0c1d2e3f4a5b',
} satisfies JourneyResponse;

export const hartwellExpiredJourney = {
  schemaVersion: 1,
  status: 'expired',
  journeyId: 'jrn-hartwell-0001',
  adviser: hartwellAdviser,
} satisfies JourneyResponse;

export const northgateSubmittedJourney = {
  schemaVersion: 1,
  status: 'submitted',
  journeyId: 'jrn-northgate-0001',
  adviser: northgateAdviser,
  submittedAt: '2026-11-19T10:12:00.000Z',
  submissionId: '0b8e5a52-3c1d-4f6e-8a79-5d2c4b1e9f30',
} satisfies JourneyResponse;

export const northgateExpiredJourney = {
  schemaVersion: 1,
  status: 'expired',
  journeyId: 'jrn-northgate-0001',
  adviser: northgateAdviser,
} satisfies JourneyResponse;

export const hartwellVerificationOpen = {
  schemaVersion: 1,
  status: 'open',
  journeyId: 'jrn-hartwell-0001',
  expiresAt: '2026-11-20T15:30:00.000Z',
} satisfies VerificationResponse;
