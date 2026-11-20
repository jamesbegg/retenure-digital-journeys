# Questions engine: client contract, interfaces and renderer

Status: revised after the third review; implementation awaits the user's go-ahead (#6 is a stop point)
Risk: high (client answers, tenant isolation, the shape every journey depends on)
Plan review: three rounds (findings at the end)

Issues: #6 (engine and renderer), with the parts of #3 (branding), #5 (question library) and #7 (journey definition) the client app consumes.

## Scope and non-goals

In scope:

- What `my-wealth-backend` returns to a client's browser and accepts back.
- The TypeScript interfaces this repository parses that into.
- The client pieces built on it:
  - `TenantService` and `JourneyService`
  - parsers at the boundary
  - a pure question renderer in `@retenure/ui`

Non-goals:

- **Selection logic.** The backend engine (#6 pipeline) decides which questions a client gets. The client renders a frozen plan and never decides what to ask. No question sets live in this repository.
- **Storing or editing the question library** (#5, #7).
- **Verification screens.** They are a separate deliverable, but the identity and session they produce are a dependency of this one (see Sessions).
- **Branded link previews.** In v1 they are neutral (see Branding).
- **Drafts and save-and-come-back.** Answers are submitted once. Drafts can be added later if drop-out data shows a need.
- **Several hosts per firm, and redirects between them.** Deferred to #3.

## Principles

1. **Frozen snapshot.** The journey payload holds everything needed to render: sections, the questions on each card at their frozen versions, client details, held data and UI copy. The client never fetches the library and never resolves ids.
2. **Firm from the host, journey from the session.** The client never sends a tenant id or journey id it read from a URL parameter or from storage. The backend refuses any request whose firm, invitation or journey disagree.
3. **Adviser-only data never reaches the browser.** No selection reasons, suppressed questions, rule ids, library ids, other households, or answers marked for the adviser.
4. **Discriminated unions wherever things vary.** Questions vary on `kind`, blocks on `type`, validators on `rule`, and an answer follows its question's `kind`. A new variant is a compile error until it has a case.
5. **Parse at the boundary.** Responses are `unknown` until a parser in `src/app/api/` narrows them. An unknown `kind`, `type`, `rule` or `schemaVersion` shows the generic error page and is logged by id only, never with answer values.
6. **No compatibility layer before launch.** Nothing is live, so the backend and client ship schema changes together. The backend sends only what the released client renders (see Release scope).
7. **Follow the backend's conventions** for errors, status codes, routes and validation (backend canon sections 7 and 12).

## Hosts and firms (v1)

- **One host per firm.** It is either `<slug>.retenure.io` or the firm's verified custom domain, never both. The backend's host table maps each host to its firm.
  - Hostnames are stored lowercase, without a port, and unique across all firms.
  - Adding or switching a host is a row change, not a deploy.
  - Switching a firm to its custom domain leaves the old host unknown, which shows the generic page. Redirects come later with #3.
- **One deployment and one set of app routes for every host.** No firm has its own routes, builds or config.
- **The edge decides which host the backend sees.**
  - CloudFront strips the viewer's `Host` before the API origin.
  - So the edge sets the viewer's hostname in its own header, `X-Retenure-Host`, and overwrites any value the browser sent.
  - The API origin accepts requests only from the edge, through a shared secret header the edge adds.
  - The backend reads the host only from `X-Retenure-Host`, and only on requests that carry that secret.
- **A custom domain goes live only when it is fully ready:**
  - its TXT record is verified (#3)
  - it is added to the distribution's alternate domain names
  - its certificate is issued
  - only then is its row set to `active`
- **Unknown, pending or suspended host:** the generic error page.

## Sessions

These are client sessions: invitation-based, with no account and no Cognito user (see Unresolved and blocking).

**Cookie and requests:**
- One host-only cookie: `__Host-ret_session`, `Secure`, `HttpOnly`, `SameSite=Strict`, `Path=/`, no `Domain`.
- The session is bound to one firm, one household, one invitation and one journey.
- Every `POST` requires:
  - `Content-Type: application/json`
  - an `Origin` exactly equal to `https://` plus the viewer host. No port is allowed; anything else gets 403.

**Headers the client sends:**
- `X-Tenant-Id`, from `TenantService`, on every call except `GET /client/tenant`, which is how the client learns it.
- `X-Journey-Id`, from the loaded journey, on renewal, submit, and any journey load made while the page already holds a journey (after reverification).

The backend checks both headers against the host and the session, and answers 409 `journey_mismatch` on any difference.

**The journey id is the binding.** `journey.id` identifies exactly one invitation and its frozen plan:
- It is created when the invitation is sent, and never reused, even when two invitations use the same journey definition.
- It never changes for the invitation's lifetime.
- A plan never changes under an existing id.
- Matching `journey.id` therefore means the same invitation and the same plan, and no other binding token is needed.
- A full page reload clears memory, so it has nothing to bind.

**Timing (WCAG 2.2.1):**
- The idle limit is 30 minutes. There is no absolute cap.
- The server is the clock. `GET /client/journey` and every renewal return `expiresAt`, the server's idle deadline, and the client schedules everything from it.
- **Active clients extend quietly.** On interaction (typing, choosing, moving between sections), the client renews in the background when less than 25 minutes remain, so at most once every 5 minutes. An active client never sees a warning.
- **Idle tabs warn.** Two minutes before `expiresAt`, the client shows a warning with "I need more time", which renews. Two minutes is well over WCAG's 20 seconds, and renewals are unlimited, well over its 10 extensions.
- **When the timer may have slipped**, the client checks it again rather than trusting it:
  - When a tab wakes up (`visibilitychange`), the client compares the clock with `expiresAt` before showing anything.
  - If a renewal fails, the client retries once. If `expiresAt` has passed, it treats the session as expired.
- **Expired:**
  - The page hides the journey: no answers or held facts stay on screen.
  - The page shows the verification step. Answers stay in memory only.
  - Reverification must return the same tenant, invitation, journey id and plan. Then the client shows the answers again and lets the client continue or submit.
  - If any of those differ, the client discards the answers and loads the new journey fresh.
  - Nothing is lost while the tab stays open, and nothing sensitive stays visible while it is unattended.

## Endpoints

These follow the backend canon: Lambda handlers, a new `client` audience, singular route segments, and responses through `jsonResponse()` and `handleError()`.

| Method and path | Success | Notes |
| --- | --- | --- |
| `GET /client/tenant` | 200 `TenantResponse` | Firm from `X-Retenure-Host`. Branding only. `Cache-Control: no-store` in v1, so a host switch or suspension takes effect immediately. |
| `GET /client/journey` | 200 `JourneyResponse` | The session's journey: `open` with its plan, or `submitted` or `expired` with only what the calm page needs. |
| `POST /client/journey/session` | 200 `SessionResponse` | Body `{}`. Renews the session and returns the new `expiresAt`. |
| `POST /client/journey/submission` | 200 `SubmissionReceipt` | Body `SubmissionBody`. Validates the whole batch, accepts it atomically, and is safe to retry. |

Every success response carries `schemaVersion: 1`. Errors use the backend's shared body unchanged (see Errors). Every response from these endpoints, success or error, has `Cache-Control: no-store, private`, including the tenant lookup.

### Submitting

- **Retry-safe.**
  - The client generates `submissionId` (a UUID) once for each submission attempt, and keeps it in memory when it retries.
  - A retry is the same `submissionId` with the same payload. The backend stores a hash of the payload with the receipt.
  - Receipts are scoped to the verified invitation: the key is `journey.id` plus `submissionId`, so an id from another invitation never matches.
  - **Same id, same payload:** the original `SubmissionReceipt` with 200.
  - **Same id, different payload:** 409 `submission_mismatch`.
  - **A concurrent request with the same id that loses the transaction:** the backend reads the committed receipt and returns it with 200.
  - **A different id after the journey was accepted:** 409 `already_submitted`. That could be another tab, or a lost submit that was then tried again.
  - **Response lost, then the session expired:** the client verifies again. If the journey is the same, it resends the same `submissionId` and payload and gets the receipt. If `GET /client/journey` already reports `submitted`, the client compares the `submissionId` it returns with its own, and shows the done screen when they match.
- **Atomic.** One transaction stores the answers, the receipt and payload hash, the invitation's move to `submitted`, and one outbox record per notification. It is conditional on the invitation still being open.
- **Notifications are queued exactly once and delivered at least once.** A worker leases each outbox record, records the attempt, sends it and marks it sent, using the same pattern as the backend's `processProposalApplies`.
  - If the worker crashes after the email provider has accepted a message but before marking it sent, a retry can send a duplicate.
  - That window is accepted for a copy email. The guarantee is no lost email and at most a rare duplicate, not exactly-once delivery.
- **The household copy never includes answers marked sensitive** (#5). Those reach the adviser only. The copy goes only to members the backend holds a verified email for.
- **The whole batch is validated against the frozen plan.** On any failure, the backend stores nothing, the invitation stays open, and it answers 400 with `fieldErrors` whose `field` is `answers.<questionId>`, or `answers` for a batch-level problem:
  - every `questionId` exists in the plan, appears once, and its `questionVersion` matches
  - each answer's `kind` matches its question's
  - option values, option-detail fields and fact ids belong to that question
  - the wire formats are right (money, ISO date, booleans)
  - every required question on an open branch is answered
  - the declared validators pass, applied by the same rules as the shared client validators
  - when follow-ups are enabled (after v1), branches are evaluated from the submitted parent answers, including nested follow-ups, and an answer on a closed branch is rejected
  - an optional question left blank is simply absent from the batch

### Errors

The backend's shared body, from `handleError()` in `src/utils/httpErrors.ts`, unchanged:

```ts
interface ApiError {
  error: string;                 // e.g. 'VALIDATION_ERROR', 'CONFLICT'
  statusCode: number;
  message: string;               // safe, never shown to the client verbatim
  requestId: string;
  fieldErrors?: { field: string; code: string; message: string }[];   // field: 'answers.<questionId>' or 'answers'
  reason?: ClientErrorReason;    // added with withReason()
}

type ClientErrorReason =
  | 'unknown_host'          // 404 on /client/tenant
  | 'journey_mismatch'      // 409: host, X-Tenant-Id, X-Journey-Id and session disagree
  | 'session_expired'       // 401
  | 'already_submitted'     // 409 on submission with a different submissionId
  | 'submission_mismatch'   // 409 on submission: same id, different payload
  | 'invalid_submission'    // 400 with fieldErrors
  | 'unsupported_plan'      // 409 on /client/journey: the frozen plan uses something this client cannot render
  | 'forbidden_origin';     // 403
```

- The client shows its own copy for each `reason`, never `message`.
- A field error's `message` is a safe fallback. The client prefers the question's own validator message for the matching `code`.
- An expired invitation and an already-submitted journey are not errors. They are `JourneyResponse` states, so the adviser's contact travels on a normal success response.

## Interfaces

All of these go in `interfaces/` folders, which hold types only:
- **`projects/ui/src/lib/interfaces/`** for what the shared renderer needs: question, answer and copy types.
- **`src/app/interfaces/`** for app-only types: responses, errors and the session.

### Tenant and branding

This shape supersedes #3's draft, and the tenancy guide is updated to match.

```ts
interface TenantResponse {
  schemaVersion: 1;
  tenant: TenantTheme;
}

interface TenantTheme {
  tenantId: string;
  displayName: string;                 // "Hartwell Wealth"; also the page title
  logo: { src: string; alt: string };
  favicon: string;
  colours: { light: BrandColours; dark: BrandColours };
  font?: { family: string; src: string };   // self-hosted woff2; system stack when absent
}

interface BrandColours {
  primary: string;      // validated at publish: 4.5:1 against the page and against onPrimary,
  onPrimary: string;    // including under the hover and pressed overlays, in both modes
}
```

- **Asset URLs.** `logo.src`, `favicon` and `font.src` must be same-origin paths under `/t/<tenantId>/`. The parser rejects any other value, including other hosts, `data:` URLs and another tenant's prefix.
- **Applying the theme.** Applied once at start-up, before the first branded render, to the `--ret-brand-*` tokens, the page title and the favicon.
- **Neutral failure.** On any tenant or journey failure, the client resets the title, favicon, tokens and all in-memory client state to neutral before showing the generic page.
- **Link previews in v1 are neutral.** The static shell's `og:` tags say "Your check-in" with no firm name, because crawlers do not run the app. Branded previews need server rendering and come later.

### Journey

```ts
type JourneyResponse =
  | {
      schemaVersion: 1;
      status: 'open';
      journey: JourneyMeta;
      client: ClientInfo;
      adviser: AdviserContact;
      sections: Section[];
      expiresAt: string;       // server idle deadline
    }
  | {
      schemaVersion: 1;
      status: 'submitted';
      journeyId: string;
      adviser: AdviserContact;
      submittedAt: string;
      submissionId: string;    // lets a tab that lost its response recognise its own submission
    }
  | { schemaVersion: 1; status: 'expired'; journeyId: string; adviser: AdviserContact };

interface SessionResponse {
  schemaVersion: 1;
  expiresAt: string;
}

interface JourneyMeta {
  id: string;
  type: 'annualCheckIn' | 'pulse' | 'followUp' | 'onboarding';
  title: string;               // "Your annual check-in"
  estimatedMinutes: number;
  copy: JourneyCopy;
  ending: { doneMessage: string };
}

interface JourneyCopy {        // every UI string the components take as input
  continue: string;
  back: string;
  edit: string;
  submit: string;
  submitting: string;          // Button pendingLabel
  checkAnswersTitle: string;
  required: string;            // "Answer this question to continue"
  errorPrefix: string;         // "Error:"
  dateLabels: { day: string; month: string; year: string };
  incompleteDate: string;
  invalidDate: string;
  stillRight: string;
  somethingChanged: string;
  leaveWarning: string;        // "If you leave, your answers will not be saved"
  timeoutWarning: string;      // "You've been inactive. Do you need more time?"
  moreTime: string;            // "I need more time"
  followUpsCleared: string;    // announced when a No closes follow-ups
}

interface ClientInfo {
  lead: Person;                // completes the journey for the household
  members: Person[];           // everyone the answers cover, lead included
}

interface Person {
  id: string;
  firstName: string;           // first names only
  role: 'lead' | 'partner' | 'dependant';
}

interface AdviserContact {
  name: string;
  email: string;               // email first, by design
  phone?: string;
}
```

### Sections and blocks

```ts
interface Section {
  id: string;
  title: string;               // the screen's h1
  intro?: string;              // one line at most
  blocks: Block[];             // at least one; a section with no card has no Continue gating
}

type Block =
  | { type: 'card'; question: Question }
  | { type: 'notice'; tone: 'info' | 'warning'; text: string }
  | { type: 'facts'; title: string; facts: HeldFact[] };
```

"Check your answers" is added by the client after the last section. It is built from the definitions and the in-memory answers, and each Edit links back to its section and card.

### Questions

```ts
interface QuestionBase {
  id: string;                  // plan instance id, unique within the journey; the answer key
  version: number;             // frozen at send
  personId?: string;           // asked about one household member (a ClientInfo member id)
  prompt: string;
  hint?: string;
  required: boolean;
  validators?: ValidatorRef[];
  followUps?: FollowUp[];
}

interface FollowUp {
  when: AnswerMatch;
  questions: Question[];       // same card; answers cleared when `when` stops matching
}

type AnswerMatch =
  | { equals: boolean | string }   // yesNo: the boolean; radio: the chosen option's value
  | { oneOf: string[] };           // radio: the value is one of these; checkbox: any selected value is

type Question =
  | (QuestionBase & { kind: 'yesNo'; yesLabel?: string; noLabel?: string })
  | (QuestionBase & { kind: 'radio'; options: QuestionOption[] })
  | (QuestionBase & { kind: 'checkbox'; options: QuestionOption[] })
  | (QuestionBase & { kind: 'text'; multiline: boolean; autocomplete?: string })
  | (QuestionBase & { kind: 'email' | 'tel'; autocomplete?: 'email' | 'tel' })
  | (QuestionBase & { kind: 'money' })
  | (QuestionBase & { kind: 'date'; autocomplete?: 'bday' })
  | (QuestionBase & { kind: 'confirmFacts'; facts: HeldFact[] })
  | (QuestionBase & { kind: 'goals'; goals: string[] });

interface QuestionOption {
  value: string;
  label: string;
  hint?: string;
  input?: { label: string; type: 'text' | 'money' | 'multiline'; required: boolean; validators?: ValidatorRef[] };
}

interface HeldFact {
  id: string;
  label: string;               // "Address"
  value: string;               // display text, already formatted
  personId?: string;
}
```

`libraryId` stays on the backend: it is for the adviser's audit view, and the client has no use for it.

### Validators

```ts
type ValidatorRef =
  | { rule: 'emailAddress'; message: string }
  | { rule: 'ukPhone'; message: string }
  | { rule: 'personName'; message: string }
  | { rule: 'dateOfBirth'; minAge?: number; maxAge?: number;
      messages: { future: string; tooYoung: string; tooOld: string } }
  | { rule: 'moneyAmount'; min?: number; max?: number;
      messages: { unreadable: string; tooLow: string; tooHigh: string } };
```

### Answers

```ts
type AnswerValue =
  | { kind: 'yesNo'; value: boolean }
  | { kind: 'radio'; value: string; input?: string }
  | { kind: 'checkbox'; values: string[]; inputs?: Record<string, string> }
  | { kind: 'text' | 'email' | 'tel'; value: string }       // trimmed
  | { kind: 'money'; value: string }                         // "1250.50": pounds, no symbol or commas
  | { kind: 'date'; value: string }                          // ISO YYYY-MM-DD
  | { kind: 'confirmFacts'; changed: { factId: string; newValue: string }[] }   // empty: all still right
  | { kind: 'goals'; changes?: string };                     // absent: still right

interface SubmissionBody {
  submissionId: string;
  answers: { questionId: string; questionVersion: number; answer: AnswerValue }[];
}

interface SubmissionReceipt {
  schemaVersion: 1;
  submissionId: string;
  submittedAt: string;
}
```

### Per-kind rules (client and backend)

| Kind | Built in, always on | Configured per question | Counts as answered |
| --- | --- | --- | --- |
| `yesNo` | none | `required` | `true` or `false` |
| `radio` | the option exists; an option input is checked by its own `required` and validators, and its error shows on that input | `required` | an option is chosen, and its required input, if any, is valid |
| `checkbox` | the options exist | `required` | at least one option is selected |
| `text`, `email`, `tel` | the value is trimmed | `required`, validators | non-empty after trimming |
| `money` | TextField emits a readable amount or the raw text; `moneyAmount` is attached automatically to report unreadable text | `required`, `moneyAmount` min and max | a readable amount |
| `date` | TextField's `incompleteDate` and `invalidDate` | `required`, `dateOfBirth` | a complete, real date |
| `confirmFacts` | none | none (always required) | the client chose Still right, or Something's changed and entered the change |
| `goals` | none | none (always required) | the same |

- **An optional question left blank** is not in the batch, and its card still counts as complete for Continue.
- **Change to RadioGroup:** it gains an `optionErrors` input (`Record<value, string>`) and passes the error to the revealed TextField. It is a small, typed addition to the shared component.

## Client pieces

```text
start         ─▶ TenantService.load()        GET /client/tenant ─▶ theme │ fail ─▶ neutral reset, generic page
route         ─▶ JourneyService.load()       GET /client/journey ─▶ parse ─▶ signals, expiresAt
section       ─▶ QuestionRenderer            section, answers, copy, members in; answersChange, complete out
answersChange ─▶ JourneyService              replaces that section's answer map in memory
activity      ─▶ JourneyService.renew()      POST /session when < 25 min left; idle warning from expiresAt
check answers ─▶ JourneyService.submit()     POST /submission { submissionId, answers } ─▶ done
```

- **`TenantService`** (`src/app/tenant/`, #3): looks the firm up once, applies the theme, and supplies `X-Tenant-Id`. It resets everything on a neutral failure.
- **`JourneyService`** (`src/app/journey/`):
  - answers held in memory only
  - session timing from the server's `expiresAt`
  - `submissionId` kept across retries
  - the leave prompt
  - JourneyShell `state` (`loading`, `ready`, `error`, `blocked`)
- **Parsers** (`src/app/api/`): one per response, failing closed.
- **`QuestionRenderer`** (`@retenure/ui`):
  - A pure component: inputs and outputs, no services, so the studio preview reuses it.
  - An exhaustive `switch` on `kind`.
  - One `FormControl` per question, with the per-kind rules above.
  - After v1, with QuestionCard: follow-ups open on their `AnswerMatch`. When a branch closes, the renderer clears its answers, emits the section map without them, and announces `copy.followUpsCleared`.

**Leaving the page (best-effort):**
- The browser's own prompt runs when there are unsent answers. Browsers may suppress it, so the copy never promises it.
- The first section says once, in plain words, that answers are sent only at the end.
- The in-app exits are guarded with a confirm: Back from the first section, and following the adviser email link.

**Screen-level behaviour belongs to the design gate for journey screens and QuestionCard (#35).** Journey screens are a stop point, so these are not specified here:
- focus after Continue, Edit and errors
- how Check your answers reflects an edit
- content-only sections
- the submit-pending state
- the timeout dialog's layout
- 320 px with 200% text, and keyboard and screen-reader passes

## Release scope

- **v1 supports these question kinds:** `yesNo`, `radio`, `text`, `email`, `tel`, `money` and `date`, the ones today's components cover.
- **v1 supports one block type:** `card`.
- **v1 has no follow-ups.** They need QuestionCard (#35), so they arrive with it.
- **Enforced in three places:**
  - The #5 publish check refuses a v1 journey definition that uses anything else.
  - **When serving,** the backend checks the frozen plan before it answers `GET /client/journey`. A plan using an unsupported kind, block or `followUps` (one frozen before the check existed, for instance) gets 409 `unsupported_plan`, and the backend alerts the adviser. It never sends a plan the client cannot render.
  - **The v1 parser** accepts only the v1 kinds and block, and rejects any `followUps`. The wire types keep the full unions for later releases, but the parser enforces the v1 subset.
- **Later, together with their components:**
  - `checkbox` (#16)
  - `confirmFacts` and `goals` (#31, #32)
  - the `notice` and `facts` blocks (#23, #31)
  - follow-ups, with QuestionCard (#35)
- **"New journey" means new data.** A new configuration of an existing `JourneyMeta.type` is backend data only. A new `type` value is a code change.
- **Studio preview depends on an upgrade.** The studio is on Angular 20, and `@retenure/ui` needs Angular 22. The studio upgrades to Angular 22 first; Angular 20 reaches end of life this month. Preview parity is not deliverable until then.

## Extensibility

| Change | What it takes |
| --- | --- |
| New section, card, copy or question of a released kind | Backend data only. |
| Same question for each household member | Plan instances with `personId`. Backend data. |
| New brand slot or client field | An optional field. |
| New question `kind`, block `type` or validator `rule` | A union member, a component variant if needed, and the renderer, parser and backend validation, in one change. |

## Security and ownership boundaries

- Firm from the edge-set host; journey from the session; `X-Tenant-Id` and `X-Journey-Id` are cross-checked, never trusted alone.
- A `__Host-` cookie with `Path=/`, an exact `Origin` match on `POST`, and `no-store` on every client response, including the tenant lookup.
- Answers are never logged, put in a URL or sent to analytics. Logs use ids and outcomes only.
- First names only; held facts are for the client's own household; no `libraryId`, reasons or suppressed list.
- Prompts, hints and fact values render as text, never as HTML. Asset URLs must be under the tenant's own prefix.
- Sensitive answers never go into the household copy.
- An expired session hides the journey. A mismatched reverification discards the in-memory answers.

## Failure behaviour

| Outcome | Client behaviour |
| --- | --- |
| `unknown_host`, tenant lookup fails | Neutral reset, then the generic error page. |
| Journey fetch or parse fails, `journey_mismatch` | Neutral reset, in-memory answers discarded, then the generic error page. |
| `session_expired`, or `expiresAt` passed | Hide the journey and show verification. Same journey: restore the answers. Different journey: discard them. |
| Journey `status: 'expired'` | A calm, branded page with the adviser's email. |
| Journey `status: 'submitted'` with this tab's `submissionId` | The done screen: the submission went through, and only its response was lost. |
| Journey `status: 'submitted'` with another id, or `already_submitted` | A calm page: "These answers were already sent on <date>", with the adviser's email. |
| `submission_mismatch` | It should not happen, because the client never changes a payload under the same id. Show the generic error page and log the ids. |
| `unsupported_plan` | The generic error page, telling the client their adviser has been told. |
| `invalid_submission` | Go to the first question in `fieldErrors` with its message. If none of them is on screen, stay on Check your answers with a general message. |
| Submit network failure | Retry with the same `submissionId`. The answers are still in memory. |

## Decisions

### Confirmed by the user

- Question sets come from the backend per client; none are stored in the frontend.
- Branding is set once at start-up from the backend; if the firm or journey cannot be fetched, the client sees a generic error page.
- Submit once at the end, with no drafts.
- The renderer and question types live in `@retenure/ui`. Per-person answers come from plan instances with `personId`. This `TenantTheme` supersedes #3's draft.
- The session extends quietly on activity, and only an idle tab warns.
- Second review, simpler options:
  - no absolute session cap
  - one host per firm and no redirects in v1
  - sensitive answers never go in the household copy
  - screen-level behaviour belongs to the design gate
  - neutral link previews in v1

### Follow-up: measuring drop-out (an ADR first)

The ADR would cover first-party events only:
- `journeyOpened`, `sectionReached { sectionId }` and `submitted`, keyed by tenant and journey
- never an answer value
- reported per firm in the studio

It must decide retention, who can see the data, and whether identifiers are scoped to the invitation.

### Unresolved and blocking (backend owner)

1. **Client auth versus the backend canon.** The backend canon requires Cognito on any endpoint that reads or writes user data. Client journeys use an invitation session with no account. The backend must either add the `client` audience to its canon, or put client sessions on Cognito (for example custom auth). This decision blocks the backend work.
2. **Route namespace.** Confirm `/client/*` as the new audience.
3. **The edge secret mechanism, decided with infrastructure:** a secret header checked by the backend, or an API Gateway resource policy.

### Unresolved and non-blocking

- Verification method payloads and screens.
- The full host lifecycle (several hosts, canonical switch, redirects, cache purge), to be planned in #3.

## Ownership, order and budget

| Owner | Work |
| --- | --- |
| Infrastructure (`my-wealth-infra`) | `X-Retenure-Host` set at the edge, the edge secret, alternate domain names and certificates for custom domains, `no-store` passed through |
| Backend (`my-wealth-backend`) | Host table; the four endpoints; the session, cookie and `Origin` rules; atomic idempotent submission with its outbox; whole-batch validation; the household copy filter; #5 publish checks including the v1 kinds |
| This repository | Interfaces with fixtures for the two synthetic firms; parsers; `TenantService` and its interceptor; `JourneyService`; RadioGroup `optionErrors`; `QuestionRenderer` for the v1 kinds |
| Studio | Angular 22 upgrade, then the preview using the shared renderer |

**Order:** infrastructure and backend first. Then this repository's services and renderer. Journey screens go through the design gate, which is a stop point. The studio comes last.

**Budget for this repository:** about 12 files across `src/app/{api,tenant,journey,interfaces}`. Plus one renderer component with its spec and story, interface files in `projects/ui`, and the RadioGroup addition. **Replan** if it needs a production dependency, a new kind, browser storage or a change to an existing component's API beyond `optionErrors`.

## Verification

- **Parsers:** each response's valid fixture parses; an unknown `kind`, `type`, `rule` or `schemaVersion`, a foreign asset URL, a wrong type or a missing field each fails.
- **Renderer:**
  - each v1 kind renders its component, and `personId` questions name the person
  - the per-kind completion rules, including optional blanks, `false` and whitespace
  - an option-input error appears on its field
  - the v1 parser rejects `checkbox`, `confirmFacts`, `goals`, `notice`, `facts` and any `followUps`
  - (after v1) follow-ups close, clear and announce
- **`JourneyService`, with HTTP mocked:**
  - renewal is throttled and scheduled from `expiresAt`, never from a local clock alone
  - the idle warning appears 2 minutes before the deadline
  - waking from sleep after the deadline goes to expired
  - an expired session hides the content; reverifying the same journey restores the answers and a different journey discards them
  - a retry keeps `submissionId`
  - each `reason` reaches its outcome
  - no answer values in logs
- **e2e:**
  - a synthetic v1 journey on both synthetic firm hosts: tenancy, a11y and zoom (the route list grows from the gallery to journey routes, and the tenancy spec loses `fixme`)
  - two invitations in one browser on one host, both using the same journey definition, have different `journey.id` values, and the second never restores the first tab's answers
  - a lost submit response followed by an expired session leads to the done screen after reverifying
  - `journey_mismatch` shows the generic page
  - client responses carry `no-store`
- **Backend (for its repository):**
  - a replay with the same id and payload returns the receipt
  - the same id with a different payload gets `submission_mismatch`
  - a different id gets `already_submitted`
  - the loser of two concurrent same-id requests gets the committed receipt
  - receipts never match across invitations
  - a frozen plan with an unsupported kind gets `unsupported_plan`
  - the tenant lookup carries `no-store`
  - a concurrent double submit accepts one
  - the household email is sent once, and never includes sensitive answers
  - batch validation for each rule above, persisting nothing on failure
  - `Origin` and edge-secret refusals
  - a host from another firm never resolves

## Plan review findings

### Second review (`c8f1673`, Codex)

| # | Finding | Resolution |
| --- | --- | --- |
| 1 | Submit not atomic or retry-safe. | Accepted: `submissionId` receipts, `already_submitted`, one transaction, an outbox email. |
| 2 | Page not bound to the invitation. | Accepted: `X-Journey-Id`; reverification checks the same journey; an expired session hides the content; a mismatch discards answers. |
| 3 | Timing not server-confirmed. | Accepted: `expiresAt` from the server, the throttle from it, wake handling. **Simplified:** no absolute cap. Canon "20 minutes" corrected. |
| 4 | Trusted hostname at the edge. | Accepted: `X-Retenure-Host` set at the edge, the edge secret, exact `Origin`, the bootstrap exemption, `Path=/`. |
| 5 | Redirect and host lifecycle. | **Simplified:** one host per firm and no redirects in v1; activation requires DNS, the alternate domain name and the certificate; full lifecycle moves to #3. |
| 6 | Whole-batch validation. | Accepted: rules listed; closed-branch answers rejected; nothing persisted on failure. |
| 7 | Household copy and `libraryId`. | Accepted, **simplified:** the copy never includes sensitive answers; `libraryId` removed from the client. |
| 8 | Wire consistency with the backend. | Accepted: backend error body and status policy, renewal returns JSON, `fieldErrors` with a fallback. |
| 9 | Renderer versus existing controls. | Accepted: per-kind rules table; RadioGroup `optionErrors`. |
| 10 | Renderer state and interaction. | **Moved** to the design gate for journey screens and #35, listed under Client pieces. |
| 11 | Honest leave behaviour. | Accepted: best-effort prompt, upfront copy, guarded in-app exits; `saveAndFinishLater` removed; canon fixed. |
| 12 | Branding boundary. | Accepted: asset URL rule, neutral reset; #3 and tenancy guide aligned. **Simplified:** neutral link previews in v1. |
| 13 | Release scope and studio. | Accepted: v1 kinds gated at publish, "new journey" clarified, studio Angular 22 dependency. |
| 14 | Readiness record and verification. | Accepted: owners, order, budget, verification matrix, review history. |

### Third review (`c489b6b`)

| # | Finding | Resolution |
| --- | --- | --- |
| 1 | Invitation continuity was not enforceable. | Accepted: `journey.id` is unique per invitation and never reused or re-planned. `X-Journey-Id` is also sent on journey loads after reverification. Test for two invitations that share one definition. |
| 2 | The retry guarantee was incomplete. | Accepted: receipts scoped to the invitation; a retry is the same id plus the same payload; a concurrent loser gets the committed receipt; recovery after an expired session goes through the journey `submitted` state. **Narrowed:** notifications are queued exactly once and delivered at least once. |
| 3 | The v1 subset was not enforced at runtime. | Accepted: the v1 parser rejects other kinds, blocks and `followUps`; the backend refuses to serve an unsupported plan (`unsupported_plan`). **Decided:** no follow-ups in v1. |
| 4 | Cache gap after a host switch. | Accepted: the tenant lookup is `no-store` in v1. |
| 5 | Error envelope mismatch. | Accepted: the backend body unchanged, with `fieldErrors` `{ field, code, message }`, `schemaVersion` on success responses only, and expired or submitted moved into the journey response states. |

### First review (draft, plan-reviewer)

All 15 findings were accepted. Several were later superseded by the user's decision to remove drafts: the save and withdraw endpoints, revisions and per-question requests are gone. The rest carry through: per-person instance ids, the cache rule, CSRF, the tenant header, error codes, messages by reason, the copy object, option-input validators, the pure renderer and Check your answers.
