import { parseApiError } from './api-error';
import {
  hartwellExpiredJourney,
  hartwellOpenJourney,
  hartwellSubmittedJourney,
  hartwellTenant,
  hartwellVerificationOpen,
  northgateOpenJourney,
  northgateTenant,
} from './fixtures';
import {
  parseJourneyResponse,
  parseSessionResponse,
  parseSubmissionReceipt,
  parseVerificationResponse,
} from './journey';
import { ParseError } from './reader';
import { parseTenantResponse } from './tenant';

const clone = (value: unknown): any => structuredClone(value);
const firstQuestion = (journey: any) => journey.sections[0].blocks[0].question;
const spending = (journey: any) => journey.sections[1].blocks[1].question;

describe('parseTenantResponse', () => {
  it('accepts both synthetic firms', () => {
    expect(parseTenantResponse(hartwellTenant)).toEqual(hartwellTenant);
    expect(parseTenantResponse(northgateTenant)).toEqual(northgateTenant);
  });

  it.each([
    ['another host', 'https://evil.example/logo.svg'],
    ['a protocol-relative URL', '//evil.example/t/hartwell/logo.svg'],
    ['a data: URL', 'data:image/svg+xml,<svg/>'],
    ["another firm's prefix", '/t/northgate/logo.svg'],
    ['a prefix that only starts the same', '/t/hartwell-evil/logo.svg'],
    ['a dot-dot segment', '/t/hartwell/../northgate/logo.svg'],
    ['an encoded segment', '/t/hartwell/%2e%2e/northgate/logo.svg'],
    ['the bare prefix', '/t/hartwell/'],
  ])('rejects a logo from %s', (_, src) => {
    const body = clone(hartwellTenant);
    body.tenant.logo.src = src;
    expect(() => parseTenantResponse(body)).toThrow(ParseError);
  });

  it('rejects a foreign favicon or font', () => {
    const favicon = clone(hartwellTenant);
    favicon.tenant.favicon = '/t/northgate/favicon.ico';
    const font = clone(hartwellTenant);
    font.tenant.font.src = 'https://fonts.example/font.woff2';
    expect(() => parseTenantResponse(favicon)).toThrow(ParseError);
    expect(() => parseTenantResponse(font)).toThrow(ParseError);
  });

  it.each(['red', 'url(https://evil.example)', '#fff; color: red', 'var(--x)'])(
    'rejects the colour %s',
    (colour) => {
      const body = clone(hartwellTenant);
      body.tenant.colours.dark.primary = colour;
      expect(() => parseTenantResponse(body)).toThrow(ParseError);
    },
  );

  it('rejects an unknown schemaVersion or a missing field', () => {
    expect(() => parseTenantResponse({ ...clone(hartwellTenant), schemaVersion: 2 })).toThrow(
      ParseError,
    );
    const body = clone(hartwellTenant);
    delete body.tenant.displayName;
    expect(() => parseTenantResponse(body)).toThrow(ParseError);
  });

  it('drops unknown fields', () => {
    const body = clone(northgateTenant);
    body.tenant.extra = '<script>';
    expect(parseTenantResponse(body)).toEqual(northgateTenant);
  });
});

describe('parseJourneyResponse', () => {
  it('accepts every status for the synthetic firms', () => {
    for (const fixture of [
      hartwellOpenJourney,
      northgateOpenJourney,
      hartwellSubmittedJourney,
      hartwellExpiredJourney,
    ]) {
      expect(parseJourneyResponse(fixture)).toEqual(fixture);
    }
  });

  it.each(['checkbox', 'confirmFacts', 'goals', 'slider'])('rejects the kind %s in v1', (kind) => {
    const body = clone(hartwellOpenJourney);
    firstQuestion(body).kind = kind;
    expect(() => parseJourneyResponse(body)).toThrow(/question\.kind: expected one of/);
  });

  it.each([
    { type: 'notice', tone: 'info', text: 'Hello' },
    { type: 'facts', title: 'What we hold', facts: [] },
  ])('rejects a $type block in v1', (block) => {
    const body = clone(hartwellOpenJourney);
    body.sections[0].blocks.push(block);
    expect(() => parseJourneyResponse(body)).toThrow(/blocks\[3\]\.type: expected one of card/);
  });

  it('rejects follow-ups in v1', () => {
    const body = clone(hartwellOpenJourney);
    body.sections[1].blocks[0].question.followUps = [{ when: { equals: true }, questions: [] }];
    expect(() => parseJourneyResponse(body)).toThrow(/followUps: not supported in v1/);
    firstQuestion(body).followUps = [];
    expect(() => parseJourneyResponse(body)).toThrow(/followUps: not supported in v1/);
  });

  it('rejects an unknown validator rule or one the kind cannot use', () => {
    const unknown = clone(hartwellOpenJourney);
    firstQuestion(unknown).validators = [{ rule: 'postcode', message: 'Enter a postcode' }];
    const mismatched = clone(hartwellOpenJourney);
    firstQuestion(mismatched).validators = [{ rule: 'ukPhone', message: 'Enter a phone number' }];
    expect(() => parseJourneyResponse(unknown)).toThrow(/rule: expected one of/);
    expect(() => parseJourneyResponse(mismatched)).toThrow(/rule: expected one of emailAddress$/);
  });

  it('rejects a validator missing a message or with a bound of the wrong type', () => {
    const message = clone(hartwellOpenJourney);
    delete message.sections[0].blocks[2].question.validators[0].messages.future;
    const bound = clone(hartwellOpenJourney);
    spending(bound).options[0].input.validators[0].min = '1';
    expect(() => parseJourneyResponse(message)).toThrow(/messages\.future/);
    expect(() => parseJourneyResponse(bound)).toThrow(/\.min: expected a number/);
  });

  it('rejects an autocomplete that does not suit the kind', () => {
    const email = clone(hartwellOpenJourney);
    firstQuestion(email).autocomplete = 'tel';
    const date = clone(hartwellOpenJourney);
    date.sections[0].blocks[2].question.autocomplete = 'name';
    expect(() => parseJourneyResponse(email)).toThrow(/autocomplete/);
    expect(() => parseJourneyResponse(date)).toThrow(/autocomplete/);
  });

  it('rejects an unknown option input type and a text question without multiline', () => {
    const input = clone(hartwellOpenJourney);
    spending(input).options[0].input.type = 'slider';
    const multiline = clone(hartwellOpenJourney);
    delete multiline.sections[1].blocks[3].question.multiline;
    expect(() => parseJourneyResponse(input)).toThrow(/input\.type/);
    expect(() => parseJourneyResponse(multiline)).toThrow(/multiline/);
  });

  it('treats a null optional field as absent', () => {
    const body = clone(hartwellOpenJourney);
    body.adviser.phone = null;
    firstQuestion(body).hint = null;
    body.sections[1].intro = null;
    expect(parseJourneyResponse(body)).toEqual(hartwellOpenJourney);
  });

  it('rejects a validator on an option input of the wrong type', () => {
    const body = clone(hartwellOpenJourney);
    spending(body).options[0].input.type = 'text';
    expect(() => parseJourneyResponse(body)).toThrow(ParseError);
  });

  it('rejects an unknown schemaVersion, status or journey type', () => {
    const version = { ...clone(hartwellOpenJourney), schemaVersion: 2 };
    const status = { ...clone(hartwellOpenJourney), status: 'draft' };
    const type = clone(hartwellOpenJourney);
    type.journey.type = 'survey';
    for (const body of [version, status, type]) {
      expect(() => parseJourneyResponse(body)).toThrow(ParseError);
    }
  });

  it('rejects a wrong type or a missing field', () => {
    const required = clone(hartwellOpenJourney);
    firstQuestion(required).required = 'yes';
    const version = clone(hartwellOpenJourney);
    firstQuestion(version).version = 0;
    const copy = clone(hartwellOpenJourney);
    delete copy.journey.copy.submit;
    const expiry = clone(hartwellOpenJourney);
    expiry.expiresAt = 'tomorrow';
    const prompt = clone(hartwellOpenJourney);
    firstQuestion(prompt).prompt = '  ';
    for (const body of [required, version, copy, expiry, prompt]) {
      expect(() => parseJourneyResponse(body)).toThrow(ParseError);
    }
  });

  it('rejects duplicate question, section, member or option ids', () => {
    const question = clone(hartwellOpenJourney);
    spending(question).id = 'q-email';
    const section = clone(hartwellOpenJourney);
    section.sections[1].id = 'sec-about-you';
    const member = clone(hartwellOpenJourney);
    member.client.members[1].id = 'per-priya';
    const option = clone(hartwellOpenJourney);
    spending(option).options[2].value = 'same';
    for (const body of [question, section, member, option]) {
      expect(() => parseJourneyResponse(body)).toThrow(/duplicate/);
    }
  });

  it('rejects a personId outside the household and a lead who is not a member', () => {
    const person = clone(hartwellOpenJourney);
    firstQuestion(person).personId = 'per-someone-else';
    const lead = clone(hartwellOpenJourney);
    lead.client.lead.id = 'per-tom';
    const twoLeads = clone(hartwellOpenJourney);
    twoLeads.client.members[1].role = 'lead';
    const role = clone(hartwellOpenJourney);
    role.client.members[1].role = 'cousin';
    expect(() => parseJourneyResponse(person)).toThrow(/personId/);
    expect(() => parseJourneyResponse(lead)).toThrow(/lead: must match/);
    expect(() => parseJourneyResponse(twoLeads)).toThrow(/lead: must match/);
    expect(() => parseJourneyResponse(role)).toThrow(/role/);
  });

  it('rejects empty sections, blocks and radio options', () => {
    const sections = { ...clone(hartwellOpenJourney), sections: [] };
    const blocks = clone(hartwellOpenJourney);
    blocks.sections[0].blocks = [];
    const options = clone(hartwellOpenJourney);
    spending(options).options = [spending(options).options[0]];
    for (const body of [sections, blocks, options]) {
      expect(() => parseJourneyResponse(body)).toThrow(ParseError);
    }
  });

  it('drops unknown fields, including libraryId', () => {
    const body = clone(northgateOpenJourney);
    firstQuestion(body).libraryId = 'lib-1';
    expect(parseJourneyResponse(body)).toEqual(northgateOpenJourney);
  });
});

describe('the smaller responses', () => {
  it('parse their valid shapes', () => {
    expect(parseVerificationResponse(hartwellVerificationOpen)).toEqual(hartwellVerificationOpen);
    expect(parseVerificationResponse(hartwellSubmittedJourney)).toEqual(hartwellSubmittedJourney);
    expect(parseVerificationResponse(hartwellExpiredJourney)).toEqual(hartwellExpiredJourney);
    const session = { schemaVersion: 1, expiresAt: '2026-11-20T15:30:00Z' };
    expect(parseSessionResponse(session)).toEqual(session);
    const receipt = {
      schemaVersion: 1,
      submissionId: hartwellSubmittedJourney.submissionId,
      submittedAt: hartwellSubmittedJourney.submittedAt,
    };
    expect(parseSubmissionReceipt(receipt)).toEqual(receipt);
  });

  it('fail closed on submitted and expired journeys', () => {
    for (const fixture of [hartwellSubmittedJourney, hartwellExpiredJourney]) {
      expect(() => parseJourneyResponse({ ...fixture, schemaVersion: 2 })).toThrow(/schemaVersion/);
      expect(() => parseJourneyResponse({ ...fixture, adviser: undefined })).toThrow(/adviser/);
    }
    expect(() =>
      parseJourneyResponse({ ...hartwellSubmittedJourney, submissionId: undefined }),
    ).toThrow(/submissionId/);
    expect(() =>
      parseVerificationResponse({ ...hartwellVerificationOpen, status: 'locked' }),
    ).toThrow(/status/);
    expect(() =>
      parseVerificationResponse({ ...hartwellVerificationOpen, schemaVersion: 2 }),
    ).toThrow(/schemaVersion/);
  });

  it('fail closed', () => {
    expect(() => parseVerificationResponse({ ...hartwellVerificationOpen, expiresAt: 1 })).toThrow(
      ParseError,
    );
    expect(() =>
      parseSessionResponse({ schemaVersion: 2, expiresAt: '2026-11-20T15:30:00Z' }),
    ).toThrow(ParseError);
    expect(() => parseSubmissionReceipt(null)).toThrow(ParseError);
    expect(() => parseSubmissionReceipt([])).toThrow(ParseError);
  });
});

describe('parseApiError', () => {
  const error = {
    error: 'VALIDATION_ERROR',
    statusCode: 400,
    message: 'Invalid submission',
    requestId: 'req-1',
    reason: 'invalid_submission',
    fieldErrors: [{ field: 'answers.q-email', code: 'emailAddress', message: 'Invalid email' }],
  };

  it('keeps a recognised reason and its field errors', () => {
    expect(parseApiError(error)).toEqual(error);
  });

  it.each(['brand_new', null, 7])('drops the reason %s so the status decides', (reason) => {
    expect(parseApiError({ ...error, reason })).not.toHaveProperty('reason');
  });

  it('returns null for a body that is not the shared error shape, such as a gateway 401', () => {
    expect(parseApiError({ message: 'Unauthorized' })).toBeNull();
    expect(parseApiError('Bad Gateway')).toBeNull();
  });
});
