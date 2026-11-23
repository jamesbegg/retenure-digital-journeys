import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DOCUMENT, DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { SectionAnswers } from '@retenure/ui';
import { firstValueFrom } from 'rxjs';
import { parseApiError } from '../api/api-error';
import {
  parseJourneyResponse,
  parseSessionResponse,
  parseSubmissionReceipt,
  parseVerificationResponse,
} from '../api/journey';
import { ClientErrorReason } from '../interfaces/api-error';
import {
  AdviserContact,
  ExpiredJourney,
  OpenJourney,
  SubmissionBody,
  SubmittedJourney,
} from '../interfaces/journey';
import { FailureInfo, JourneyStage, SubmitProblem } from '../interfaces/journey-service';
import { TenantService } from '../tenant/tenant.service';

const MINUTE = 60_000;
const RENEW_UNDER = 25 * MINUTE;
const WARN_BEFORE = 2 * MINUTE;

@Injectable({ providedIn: 'root' })
export class JourneyService {
  private readonly http = inject(HttpClient);
  private readonly tenant = inject(TenantService);
  private readonly document = inject(DOCUMENT);

  private token: string | null = null;
  private submissionId: string | null = null;
  private expiresAt = 0;
  private renewing = false;
  private warnTimer: ReturnType<typeof setTimeout> | undefined;
  private expireTimer: ReturnType<typeof setTimeout> | undefined;

  readonly stage = signal<JourneyStage>('link-problem');
  readonly errorReason = signal<ClientErrorReason | null>(null);
  readonly verificationFailed = signal(false);
  readonly busy = signal(false);
  readonly journeyId = signal<string | null>(null);
  readonly journey = signal<OpenJourney | null>(null);
  readonly adviser = signal<AdviserContact | null>(null);
  readonly submittedAt = signal<string | null>(null);
  // Null after a lost response: the receipt-only result carries no client name.
  readonly doneName = signal<string | null>(null);
  readonly idleWarning = signal(false);
  readonly submitProblem = signal<SubmitProblem | null>(null);
  readonly fieldErrors = signal<Record<string, string>>({});
  readonly answers = signal<Record<string, SectionAnswers>>({});

  readonly invalidSection = computed(() => {
    const [first] = Object.keys(this.fieldErrors());
    return (
      this.journey()?.sections.find((s) =>
        s.blocks.some((b) => b.type === 'card' && b.question.id === first),
      )?.id ?? null
    );
  });
  readonly hasUnsent = computed(() =>
    Object.values(this.answers()).some((a) => Object.keys(a).length > 0),
  );

  constructor() {
    this.takeToken();
    this.stage.set(this.token ? 'verify' : 'link-problem');
    const stop = new AbortController();
    inject(DestroyRef).onDestroy(() => {
      stop.abort();
      this.clearTimers();
    });
    const { signal } = stop;
    for (const type of ['keydown', 'pointerdown']) {
      this.document.addEventListener(type, () => void this.activity(), { signal });
    }
    this.document.addEventListener(
      'visibilitychange',
      () => this.document.visibilityState === 'visible' && this.check(),
      { signal },
    );
    this.document.defaultView?.addEventListener(
      'beforeunload',
      (event) => this.hasUnsent() && event.preventDefault(),
      { signal },
    );
  }

  // The link's token lives in the fragment, which never reaches a server. Remove it before any request.
  private takeToken(): void {
    const view = this.document.defaultView;
    if (!view) return;
    const { pathname, search, hash } = view.location;
    this.token = new URLSearchParams(hash.slice(1)).get('t');
    if (hash) view.history.replaceState(view.history.state, '', pathname + search);
  }

  async verify(dateOfBirth: string): Promise<void> {
    if (!this.token) return this.stage.set('link-problem');
    this.busy.set(true);
    this.verificationFailed.set(false);
    try {
      const result = parseVerificationResponse(
        await this.post('/client/verification', { token: this.token, dateOfBirth }),
      );
      if (result.status === 'open') {
        if (this.journeyId() !== result.journeyId) this.discard();
        this.journeyId.set(result.journeyId);
        this.stage.set('loading');
        this.track(result.expiresAt);
        await this.load();
      } else {
        this.finish(result);
      }
    } catch (error) {
      this.verifyFailed(error);
    } finally {
      this.busy.set(false);
    }
  }

  async load(): Promise<void> {
    try {
      const result = parseJourneyResponse(await firstValueFrom(this.http.get('/client/journey')));
      if (result.status !== 'open') return this.finish(result);
      if (this.journeyId() !== result.journey.id) this.discard();
      this.journey.set(result);
      this.adviser.set(result.adviser);
      this.stage.set('ready');
      this.track(result.expiresAt);
    } catch (error) {
      this.protectedFailed(error);
    }
  }

  setAnswers(sectionId: string, answers: SectionAnswers): void {
    this.answers.update((all) => ({ ...all, [sectionId]: answers }));
    // A changed payload needs a new id, or the backend would answer submission_mismatch.
    this.submissionId = null;
    void this.activity();
  }

  async submit(): Promise<void> {
    const journey = this.journey();
    if (!journey || this.busy()) return;
    this.busy.set(true);
    this.submitProblem.set(null);
    this.fieldErrors.set({});
    this.submissionId ??= crypto.randomUUID();
    const body: SubmissionBody = {
      submissionId: this.submissionId,
      answers: journey.sections.flatMap((section) =>
        section.blocks.flatMap((block) => {
          const answer =
            block.type === 'card' ? this.answers()[section.id]?.[block.question.id] : undefined;
          return block.type === 'card' && answer
            ? [{ questionId: block.question.id, questionVersion: block.question.version, answer }]
            : [];
        }),
      ),
    };
    try {
      parseSubmissionReceipt(await this.post('/client/journey/submission', body));
      this.doneName.set(journey.client.lead.firstName);
      this.clear();
      this.stage.set('done');
    } catch (error) {
      await this.submitFailed(error);
    } finally {
      this.busy.set(false);
    }
  }

  // "I need more time" on the idle warning.
  extend(): Promise<void> {
    return this.renew();
  }

  private async activity(): Promise<void> {
    if (this.stage() === 'ready' && this.expiresAt - Date.now() < RENEW_UNDER) await this.renew();
  }

  private async renew(): Promise<void> {
    if (this.renewing) return;
    this.renewing = true;
    try {
      for (let attempt = 0; ; attempt++) {
        try {
          const { expiresAt } = parseSessionResponse(
            await this.post('/client/journey/session', {}),
          );
          this.track(expiresAt);
          return;
        } catch (error) {
          // Retry once. An unexplained 401 or 403, or a passed deadline, is an expired session.
          if (this.sessionGone(error) || Date.now() >= this.expiresAt) return this.lapse();
          if (describe(error).reason) return this.protectedFailed(error);
          if (attempt === 1) return;
        }
      }
    } finally {
      this.renewing = false;
    }
  }

  // Schedules the idle warning and the deadline from the server's expiresAt, never a local count.
  private track(expiresAt: string): void {
    this.expiresAt = Date.parse(expiresAt);
    this.idleWarning.set(false);
    this.clearTimers();
    const left = this.expiresAt - Date.now();
    this.warnTimer = setTimeout(() => this.idleWarning.set(true), Math.max(0, left - WARN_BEFORE));
    this.expireTimer = setTimeout(() => this.lapse(), Math.max(0, left));
  }

  // The timers may have slept through a closed lid: compare the clock before trusting them.
  private check(): void {
    if (this.stage() !== 'ready') return;
    const left = this.expiresAt - Date.now();
    if (left <= 0) this.lapse();
    else if (left <= WARN_BEFORE) this.idleWarning.set(true);
  }

  private lapse(): void {
    this.clearTimers();
    this.idleWarning.set(false);
    this.stage.set('verify');
  }

  private finish(result: SubmittedJourney | ExpiredJourney): void {
    this.clearTimers();
    this.adviser.set(result.adviser);
    if (result.status === 'expired') {
      this.discard();
      this.stage.set('expired');
    } else if (result.submissionId === this.submissionId) {
      this.doneName.set(null);
      this.clear();
      this.stage.set('done');
    } else {
      this.submittedAt.set(result.submittedAt);
      this.discard();
      this.stage.set('already-completed');
    }
  }

  private verifyFailed(error: unknown): void {
    const { reason } = describe(error);
    if (reason === 'verification_failed') this.verificationFailed.set(true);
    else if (reason === 'verification_locked') this.stage.set('locked');
    else if (reason === 'link_reissued') this.stage.set('link-reissued');
    else if (reason === 'link_requested') this.stage.set('link-requested');
    else this.fail(reason);
  }

  private async submitFailed(error: unknown): Promise<void> {
    const { reason, status, apiError } = describe(error);
    if (reason === 'invalid_submission') {
      this.fieldErrors.set(
        Object.fromEntries(
          (apiError?.fieldErrors ?? []).map((e) => [e.field.replace(/^answers\./, ''), e.message]),
        ),
      );
      this.submitProblem.set('invalid');
    } else if (reason === 'already_submitted' || reason === 'journey_expired') {
      await this.load();
    } else if (!reason && (status === 0 || status >= 500)) {
      this.submitProblem.set('network');
    } else {
      this.protectedFailed(error);
    }
  }

  // A recognised reason wins. Without one, the gateway's 401 and 403 mean the session is gone.
  private protectedFailed(error: unknown): void {
    const { reason } = describe(error);
    if (this.sessionGone(error)) this.lapse();
    else this.fail(reason);
  }

  private sessionGone(error: unknown): boolean {
    const { reason, status } = describe(error);
    return reason === 'session_expired' || (!reason && (status === 401 || status === 403));
  }

  private fail(reason?: ClientErrorReason): void {
    this.tenant.reset();
    this.discard();
    this.clearTimers();
    this.errorReason.set(reason ?? null);
    this.stage.set('error');
  }

  // A different journey, or a failure: nothing of the old one may survive.
  private discard(): void {
    this.clear();
    this.journey.set(null);
    this.submissionId = null;
  }

  private clear(): void {
    this.answers.set({});
    this.clearTimers();
  }

  private clearTimers(): void {
    clearTimeout(this.warnTimer);
    clearTimeout(this.expireTimer);
  }

  private post(url: string, body: unknown): Promise<unknown> {
    return firstValueFrom(this.http.post(url, body));
  }
}

function describe(error: unknown): FailureInfo {
  if (!(error instanceof HttpErrorResponse)) return { status: -1, apiError: null };
  const apiError = parseApiError(error.error);
  return { status: error.status, apiError, reason: apiError?.reason };
}
