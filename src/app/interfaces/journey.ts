import { AnswerValue, JourneyCopy, Person, Section } from '@retenure/ui';

export interface AdviserContact {
  name: string;
  email: string;
  phone?: string;
}

export interface ClientInfo {
  lead: Person;
  members: Person[];
}

export interface JourneyMeta {
  id: string;
  type: 'annualCheckIn' | 'pulse' | 'followUp' | 'onboarding';
  title: string;
  estimatedMinutes: number;
  copy: JourneyCopy;
}

export interface OpenJourney {
  schemaVersion: 1;
  status: 'open';
  journey: JourneyMeta;
  client: ClientInfo;
  adviser: AdviserContact;
  sections: Section[];
  expiresAt: string;
}

export interface SubmittedJourney {
  schemaVersion: 1;
  status: 'submitted';
  journeyId: string;
  adviser: AdviserContact;
  submittedAt: string;
  submissionId: string;
}

export interface ExpiredJourney {
  schemaVersion: 1;
  status: 'expired';
  journeyId: string;
  adviser: AdviserContact;
}

export type JourneyResponse = OpenJourney | SubmittedJourney | ExpiredJourney;

export type VerificationResponse =
  | { schemaVersion: 1; status: 'open'; journeyId: string; expiresAt: string }
  | SubmittedJourney
  | ExpiredJourney;

export interface SessionResponse {
  schemaVersion: 1;
  expiresAt: string;
}

export interface SubmissionBody {
  submissionId: string;
  answers: { questionId: string; questionVersion: number; answer: AnswerValue }[];
}

export interface SubmissionReceipt {
  schemaVersion: 1;
  submissionId: string;
  submittedAt: string;
}
