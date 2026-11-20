import { JourneyCopy, Person } from '@retenure/ui';
import {
  AdviserContact,
  ExpiredJourney,
  JourneyMeta,
  JourneyResponse,
  SessionResponse,
  SubmissionReceipt,
  SubmittedJourney,
  VerificationResponse,
} from '../interfaces/journey';
import { Reader, unique } from './reader';
import { parseSections } from './sections';

function copy(reader: Reader): JourneyCopy {
  const dateLabels = reader.object('dateLabels');
  return {
    continue: reader.string('continue'),
    back: reader.string('back'),
    edit: reader.string('edit'),
    submit: reader.string('submit'),
    submitting: reader.string('submitting'),
    checkAnswersTitle: reader.string('checkAnswersTitle'),
    required: reader.string('required'),
    errorPrefix: reader.string('errorPrefix'),
    dateLabels: {
      day: dateLabels.string('day'),
      month: dateLabels.string('month'),
      year: dateLabels.string('year'),
    },
    incompleteDate: reader.string('incompleteDate'),
    invalidDate: reader.string('invalidDate'),
    stillRight: reader.string('stillRight'),
    somethingChanged: reader.string('somethingChanged'),
    leaveWarning: reader.string('leaveWarning'),
    timeoutWarning: reader.string('timeoutWarning'),
    moreTime: reader.string('moreTime'),
    followUpsCleared: reader.string('followUpsCleared'),
  };
}

function meta(reader: Reader): JourneyMeta {
  return {
    id: reader.string('id'),
    type: reader.oneOf('type', ['annualCheckIn', 'pulse', 'followUp', 'onboarding']),
    title: reader.string('title'),
    estimatedMinutes: reader.integer('estimatedMinutes', 1),
    copy: copy(reader.object('copy')),
    ending: { doneMessage: reader.object('ending').string('doneMessage') },
  };
}

function person(reader: Reader): Person {
  return {
    id: reader.string('id'),
    firstName: reader.string('firstName'),
    role: reader.oneOf('role', ['lead', 'partner', 'dependant']),
  };
}

function adviser(reader: Reader): AdviserContact {
  return {
    name: reader.string('name'),
    email: reader.string('email'),
    phone: reader.optionalString('phone'),
  };
}

function submitted(body: Reader): SubmittedJourney {
  return {
    schemaVersion: body.schemaVersion(),
    status: 'submitted',
    journeyId: body.string('journeyId'),
    adviser: adviser(body.object('adviser')),
    submittedAt: body.timestamp('submittedAt'),
    submissionId: body.string('submissionId'),
  };
}

function expired(body: Reader): ExpiredJourney {
  return {
    schemaVersion: body.schemaVersion(),
    status: 'expired',
    journeyId: body.string('journeyId'),
    adviser: adviser(body.object('adviser')),
  };
}

export function parseJourneyResponse(json: unknown): JourneyResponse {
  const body = Reader.from(json, 'journeyResponse');
  const status = body.oneOf('status', ['open', 'submitted', 'expired']);
  if (status === 'submitted') return submitted(body);
  if (status === 'expired') return expired(body);

  const client = body.object('client');
  const lead = person(client.object('lead'));
  const members = client.objects('members', person, 1);
  const memberIds = members.map((m) => m.id);
  unique(memberIds, 'journeyResponse.client.members');
  const leads = members.filter((m) => m.role === 'lead');
  if (leads.length !== 1 || leads[0].id !== lead.id || leads[0].firstName !== lead.firstName) {
    client.fail('lead', 'must match the one member with the lead role');
  }
  return {
    schemaVersion: body.schemaVersion(),
    status,
    journey: meta(body.object('journey')),
    client: { lead, members },
    adviser: adviser(body.object('adviser')),
    sections: parseSections(body, new Set(memberIds)),
    expiresAt: body.timestamp('expiresAt'),
  };
}

export function parseVerificationResponse(json: unknown): VerificationResponse {
  const body = Reader.from(json, 'verificationResponse');
  const status = body.oneOf('status', ['open', 'submitted', 'expired']);
  if (status === 'submitted') return submitted(body);
  if (status === 'expired') return expired(body);
  return {
    schemaVersion: body.schemaVersion(),
    status,
    journeyId: body.string('journeyId'),
    expiresAt: body.timestamp('expiresAt'),
  };
}

export function parseSessionResponse(json: unknown): SessionResponse {
  const body = Reader.from(json, 'sessionResponse');
  return { schemaVersion: body.schemaVersion(), expiresAt: body.timestamp('expiresAt') };
}

export function parseSubmissionReceipt(json: unknown): SubmissionReceipt {
  const body = Reader.from(json, 'submissionReceipt');
  return {
    schemaVersion: body.schemaVersion(),
    submissionId: body.string('submissionId'),
    submittedAt: body.timestamp('submittedAt'),
  };
}
