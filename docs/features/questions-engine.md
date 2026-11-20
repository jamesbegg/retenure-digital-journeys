# Questions engine: client contract, interfaces and renderer

Status: plan-reviewed; decisions confirmed by the user; implementation awaits the user's go-ahead (#6 is a stop point)
Risk: high (client answers, tenant isolation, the shape every journey depends on)
Plan review: done (findings below)

Issues: #6 (engine and renderer), with the parts of #3 (branding), #5 (question library) and #7 (journey definition) the client app consumes.

## Scope and non-goals

In scope:

- what `my-wealth-backend` returns to a client's browser and accepts back
- the TypeScript interfaces this repository parses that into
- the client pieces that use it: `TenantService`, `JourneyService`, parsers, and a question renderer that builds the form from the payload with the shared validators

Non-goals:

- **Selection logic.** Which questions a client gets, in what order and why, is the backend engine (#6 pipeline). The client renders a frozen plan and never decides what to ask.
- **Storing or editing the question library** (#5, #7). No question sets live in this repository.
- **Verification screens** (code or date-of-birth check). The session they produce is assumed here.
- **Applying the theme** beyond its payload. That is #3, planned alongside this and built separately.

## Principles

1. **The backend sends a resolved, frozen snapshot.** The journey payload contains everything needed to render: sections, the questions on each card at their frozen versions, client details, held data and copy. The client never fetches the library and never resolves ids.
2. **The firm comes from the host.**
   - The app looks the tenant up from the host once and sends `X-Tenant-Id` on every call (the tenancy canon's interceptor).
   - The backend checks that header against the host and against the session's tenant, and refuses on any mismatch.
   - The journey comes from the session. The app never sends a journey id it read from a URL parameter or from storage.
3. **Adviser-only data never reaches the browser.** No selection reasons, suppressed questions, rule ids, other households, or answers marked for the adviser.
4. **Discriminated unions where things vary.** Questions vary on `kind`, blocks on `type`, validators on `rule`, and an answer follows its question's `kind`. A new variant is a compile error until it has a case.
5. **Parse at the boundary.**
   - Responses are `unknown` until a parser in `src/app/api/` turns them into these types.
   - A payload that fails to parse, or whose `schemaVersion` the client does not know, shows the generic error page.
   - The failure is logged by id only, never with answer values.
6. **No compatibility layer before launch.** Nothing is live (AGENTS.md), so backend and client ship schema changes together. Revisit at launch.

## Hosts and firms

One deployment serves every host. The app has no per-firm routes, builds or config: it asks `GET /public/tenant` once, and the backend answers from the `Host` header.

- **Host table (backend).** Each row holds `host`, `tenantId`, `canonical`, `status` (`pending` until DNS verification, then `active` or `suspended`), and `verifiedAt`. A firm can have several hosts, for example `hartwell.retenure.io` and `checkin.hartwellwealth.co.uk`. Adding a host is a new row, not a deploy.
- **One canonical host per firm.**
  - Invitation emails, links and `og:` tags always use the canonical host.
  - A request to a firm's non-canonical host is answered with a 301 to the same path on the canonical host. This sends the subdomain to the firm's own domain, never the other way (`docs/agentic-memory.md`).
  - Each host is its own origin, so a session cookie on one host is never sent to another. Keeping clients on one host avoids a second verification.
- **Edge.**
  - All hosts reach the same origin. `*.retenure.io` has a wildcard certificate.
  - A custom domain is a CNAME to the shared target (for example `custom.retenure.io`). Its certificate is issued only after the firm's TXT record verifies, as #3 sets out.
  - The CDN cache key includes the host.
- **Unknown, pending or suspended host.** `GET /public/tenant` answers 404 `unknownHost`, and the app shows the generic error page.

## Endpoints

All endpoints are under `/api/v1`, same origin, JSON, and every response carries `schemaVersion: 1`.

| Method and path | Returns | Notes |
| --- | --- | --- |
| `GET /public/tenant` | `TenantResponse` | Tenant from the `Host` header. Branding only. 404 for an unknown, unverified or suspended host. |
| `GET /journey` | `JourneyResponse` | The session's journey. |
| `POST /journey/session` | 204 | Extends the session when the client chooses "I need more time". |
| `POST /journey/submit` | `SubmitResult` | Body `SubmitBody`: every answer, once, at the end. |

**No drafts.** Answers stay in the page until Submit, and nothing is stored before then, on the server or in the browser (user decision). A refresh or closed tab loses unsent answers, so the page asks before leaving. Drafts can be added later if drop-out data shows a need.

`questionId` is always the plan instance id (see Questions).

**Session and request rules:**
- Auth is a host-only `__Host-` session cookie: `Secure`, `HttpOnly`, `SameSite=Strict`, no `Domain` attribute. Every `*.retenure.io` firm counts as the same site, so `SameSite` alone does not stop one firm's subdomain sending forged writes. That is why the next two rules exist.
- `POST` requests require `Content-Type: application/json` and an `Origin` header equal to the request host. Anything else gets 403.
- `GET /journey` and every write respond with `Cache-Control: no-store, private`. The CDN key includes only the host, so a cached journey would reach another household of the same firm.
- `GET /public/tenant` may be cached per host.

**Session timing (WCAG 2.2.1):**
- The session has an idle limit of at least 30 minutes.
- The app warns 2 minutes before it ends, with "I need more time", which calls `POST /journey/session`.
- If the session has ended by the time the client submits, the backend answers 401 `sessionExpired`. The client verifies again and resubmits the answers it still holds in memory, so nothing is lost while the page stays open.

### Errors

Every non-2xx response has this body:

```ts
interface ApiError {
  code:
    | 'unknownHost'       // 404 on /public/tenant
    | 'tenantMismatch'    // 409: host, X-Tenant-Id and session disagree
    | 'sessionExpired'    // 401: verify again, then resubmit
    | 'expired'           // 410: the invitation has passed its date
    | 'submitted'         // 410: already submitted
    | 'invalidAnswer'     // 422: kind mismatch, unknown question, stale version, closed follow-up branch
    | 'missingAnswers'    // 422 on submit: required answers absent
    | 'forbidden';        // 403: Origin or content-type check failed
  questionIds?: string[];
  adviser?: AdviserContact;   // on 'expired' and 'submitted', so the calm page can show the email
}
```

## Interfaces

These go in `interfaces/` folders, which hold types only (enforced by lint):
- `projects/ui/src/lib/interfaces/`: what the shared renderer needs (question, answer, copy), so the studio preview gets it too.
- `src/app/interfaces/`: app-only types (responses, errors, session).

### Tenant (branding)

This shape supersedes the draft `TenantTheme` in #3. #3 drops `adviserContactDefaults`, because the adviser comes with the journey.

```ts
interface TenantResponse {
  schemaVersion: 1;
  tenant: TenantTheme;
}

interface TenantTheme {
  tenantId: string;
  displayName: string;                 // "Hartwell Wealth"; also the page title and og:site_name
  logo: { src: string; alt: string };  // tenant-prefixed path, same origin
  favicon: string;
  colours: { light: BrandColours; dark: BrandColours };
  font?: { family: string; src: string };  // self-hosted woff2; system stack when absent
}

interface BrandColours {
  primary: string;      // validated at publish: 4.5:1 against the page and against onPrimary,
  onPrimary: string;    // including under the hover and pressed overlays, in both modes
}
```

Applied once at start-up to the `--ret-brand-*` tokens on `:root`, before the first branded render. A new brand slot is an optional field and one token.

### Journey

```ts
interface JourneyResponse {
  schemaVersion: 1;
  journey: JourneyMeta;
  client: ClientInfo;
  adviser: AdviserContact;
  sections: Section[];
}

interface JourneyMeta {
  id: string;
  type: 'annualCheckIn' | 'pulse' | 'followUp' | 'onboarding';
  title: string;               // "Your annual check-in"
  estimatedMinutes: number;
  expiresAt: string;           // ISO date-time
  copy: JourneyCopy;
  ending: { doneMessage: string; copyToHousehold: boolean };
}

interface JourneyCopy {        // every UI string the components take as input, in one place
  continue: string;            // "Continue"
  back: string;
  edit: string;
  saveAndFinishLater: string;
  checkAnswersTitle: string;   // "Check your answers"
  submit: string;
  required: string;            // "Answer this question to continue"
  errorPrefix: string;         // "Error:"
  dateLabels: { day: string; month: string; year: string };
  incompleteDate: string;      // "Enter a day, month and year"
  invalidDate: string;         // "Enter a real date"
  stillRight: string;          // ConfirmItem labels
  somethingChanged: string;
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
  blocks: Block[];
}

type Block =
  | { type: 'card'; question: Question }                       // one card; follow-ups stay on it
  | { type: 'notice'; tone: 'info' | 'warning'; text: string }
  | { type: 'facts'; title: string; facts: HeldFact[] };       // read-only, e.g. "What we hold"
```

"Check your answers" is not a section. The client adds it after the last section, builds the summary from the definitions and answers, and links each Edit back to its section and card.

### Questions

```ts
interface QuestionBase {
  id: string;                  // plan instance id, unique within the journey; the answer key
  libraryId: string;           // the library question (#5), for the adviser's view and audit
  version: number;             // frozen at send
  personId?: string;           // set when asked per person ("For Tom: ..."); a ClientInfo member id
  prompt: string;              // the label or legend, plain language
  hint?: string;
  required: boolean;
  validators?: ValidatorRef[];
  followUps?: FollowUp[];
}

interface FollowUp {
  when: AnswerMatch;
  questions: Question[];       // on the same card; their answers are cleared when `when` stops matching
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

interface QuestionOption {     // RadioOption from @retenure/ui, plus validators on its input
  value: string;
  label: string;
  hint?: string;
  input?: { label: string; type: 'text' | 'money' | 'multiline'; validators?: ValidatorRef[] };
}

interface HeldFact {
  id: string;
  label: string;               // "Address"
  value: string;               // display text, already formatted
  personId?: string;
}
```

How each `kind` is rendered follows the journey-ux rules:
- `yesNo` → YesNo
- `radio` → RadioGroup (three or more options)
- `checkbox` → CheckboxGroup
- `text`, `email`, `tel`, `money`, `date` → TextField
- `confirmFacts` and `goals` → FactCard and ConfirmItem

A `kind` sets the control and the keyboard only. All validation comes from `required` and `validators`, so there is one mechanism.

### Validators

Named references to the shared validators in `@retenure/ui`. The messages are keyed by the reason each validator reports, so the copy stays with the question:

```ts
type ValidatorRef =
  | { rule: 'emailAddress'; message: string }
  | { rule: 'ukPhone'; message: string }
  | { rule: 'personName'; message: string }
  | {
      rule: 'dateOfBirth';
      minAge?: number;
      maxAge?: number;
      messages: { future: string; tooYoung: string; tooOld: string };
    }
  | {
      rule: 'moneyAmount';
      min?: number;
      max?: number;
      messages: { unreadable: string; tooLow: string; tooHigh: string };
    };
```

Missing-answer, incomplete-date and invalid-date messages come from `JourneyMeta.copy`.

### Answers

```ts
type AnswerValue =
  | { kind: 'yesNo'; value: boolean }
  | { kind: 'radio'; value: string; input?: string }
  | { kind: 'checkbox'; values: string[]; inputs?: Record<string, string> }
  | { kind: 'text' | 'email' | 'tel'; value: string }
  | { kind: 'money'; value: string }        // pounds as a decimal string, no symbol or commas: "1250.50"
  | { kind: 'date'; value: string }         // ISO YYYY-MM-DD; an incomplete date is never sent
  | { kind: 'confirmFacts'; changed: { factId: string; newValue: string }[] }   // empty: all still right
  | { kind: 'goals'; changes?: string };    // absent: still right

interface SubmittedAnswer {
  questionId: string;          // plan instance id
  questionVersion: number;
  answer: AnswerValue;
}

interface SubmitBody {
  answers: SubmittedAnswer[];  // open branches only; closed follow-ups are left out
}

interface SubmitResult { submittedAt: string }
```

These shapes match what the shared components already emit:
- YesNo emits a `boolean`.
- RadioGroup emits `{ value, input? }`.
- TextField emits money as a plain decimal string and a date as ISO.

The backend answers 422 `invalidAnswer` if an answer's `kind` differs from its question's, the question is unknown, the version is stale, or the answer belongs to a follow-up whose branch is closed.

**At submit**, the backend runs the same `AnswerMatch` checks:
- It drops any answer whose branch is closed.
- It refuses with `missingAnswers` if a required answer on an open branch is absent.

## Client pieces

```text
app start    ─▶ TenantService.load()      GET /public/tenant ─▶ theme on :root │ 404 ─▶ generic error page
route        ─▶ JourneyService.load()     GET /journey ─▶ parse ─▶ signals       │ error ─▶ page for its code
section      ─▶ QuestionRenderer          section + answers in; answersChange / complete out
answersChange─▶ JourneyService            answers held in a signal, in memory only
check answers─▶ JourneyService.submit()   POST { answers } ─▶ done screen
```

- **`TenantService`** (`src/app/tenant/`, #3) makes one call, applies the theme, and holds `tenantId` for the `X-Tenant-Id` header.
- **`JourneyService`** (`src/app/journey/`):
  - Holds the journey state as signals and does the HTTP.
  - Holds answers in memory only, and asks before the page is left with unsent answers.
  - Runs the session-timeout warning.
  - Shows the screen state through JourneyShell's `state` (`loading`, `ready`, `error`, `blocked`).
- **Parsers** (`src/app/api/`): one per response. They reject an unknown `kind`, `type`, `rule` or `schemaVersion`.
- **`QuestionRenderer`** is a pure component:
  - Inputs: `section`, `answers`, `copy`, `members`.
  - Outputs: `answersChange` (the full answer map for the section, with closed follow-ups removed) and `complete`.
  - It never calls a service, so the studio preview can use it with no backend.
  - It uses an exhaustive `switch` on `kind` and builds one `FormControl` per question, with `Validators.required` and the shared validators attached by `rule`.
  - It opens follow-ups when their `AnswerMatch` holds, and clears their answers when it stops.
  - It applies the progressive-disclosure rules (#35, journey-ux).

## Extensibility

| Change | What it takes |
| --- | --- |
| New section, card, copy, or question of an existing kind | Backend data only. No client release. |
| Same question per household member | Two plan instances with `personId`. Backend data only. |
| New brand slot or client field | Optional field, ignored until used. |
| New question `kind`, block `type` or validator `rule` | Union member, component variant if needed, renderer and parser case, in one change across backend and client. |
| New journey type | Backend data (#7) if it uses existing kinds and blocks. |

## Security and ownership boundaries

- Tenant from host; journey from session; `X-Tenant-Id` checked, never trusted alone.
- `__Host-` cookie, `Origin` and content-type checks on writes, and `no-store` on journey responses.
- Answers are never logged, put in a URL or sent to analytics; logs use question ids and outcomes only.
- Payload minimisation: first names only; held facts for the client's own household only; no reasons or suppressed list.
- Prompts, hints and fact values render as text, never as HTML.
- Nothing is stored before submit. Answers from closed follow-ups are left out by the client and rejected again by the backend.

## Failure behaviour

| Code or situation | Client behaviour |
| --- | --- |
| `unknownHost`, `tenantMismatch`, tenant lookup fails | Generic error page, no branding. |
| Journey cannot be fetched or parsed | Generic error page. |
| `sessionExpired` | Verification step, then resubmit the answers held in memory. |
| `expired`, `submitted` | A calm, branded page with the adviser's email from `ApiError.adviser`. |
| Submit fails (network) | Stay on Check your answers with a retry; the answers are still in memory. |
| Client leaves with unsent answers | The browser asks to confirm. |
| `missingAnswers`, `invalidAnswer` | Take the client to the first listed question with its message. |

## Decisions

### Confirmed by the user

- Question sets come from the backend per client; none are stored in the frontend.
- Branding is set once at start-up from the backend; if the firm or journey cannot be fetched, a generic error page shows.
- The shared validators are light-touch and attached per question.
- Submit once at the end, with no drafts. Drafts can come later if drop-out data shows a need.
- Accepted: the renderer and question types live in `@retenure/ui`; per-person answers come from plan instances with `personId`; this `TenantTheme` supersedes #3's draft.

### Follow-up: measuring drop-out

The user wants analytics to show where clients drop out. The canon allows no third-party analytics on journey pages without an ADR, because answers are sensitive. The proposal for that ADR:
- first-party events only, sent to the backend: `journeyOpened`, `sectionReached { sectionId }` and `submitted`
- each event keyed by tenant and journey, and never carrying an answer value
- reported per firm in the studio

Not built in this piece.

### Proposed earlier, now settled

1. ~~Drafts on the server only.~~ Superseded: the user chose submit-once with no drafts.
2. **The renderer and question types live in `@retenure/ui`,** not `src/app/engine` as the canon says. The studio preview has to render exactly what clients see (#7). The canon would be updated.
3. **Per-person answers through plan instances with `personId`,** not one answer holding several people.
4. **This `TenantTheme` supersedes #3's draft.** Colours come in light and dark pairs, and the adviser contact moves to the journey.

### Unresolved and blocking

- **Backend repository access.** `my-wealth-backend` is outside this session. The cross-repo rule says the backend lands first; this contract is the proposal for it.

### Unresolved and non-blocking

- Verification method payloads and screens.
- Several components must exist before the renderer covers every kind: CheckboxGroup, FactCard, ConfirmItem, QuestionCard and Notice (#16, #31, #32, #35, #23). The first build can cover `yesNo`, `radio`, `text`, `email`, `tel`, `money` and `date` with today's components.

## Dependency order

1. Backend:
   - the host table and canonical redirect
   - the three endpoints with this schema
   - the cookie, `Origin` and cache rules
   - #5's publish-time checks
2. This repo:
   - the interfaces, with fixtures for the two synthetic firms
   - the parsers
   - `TenantService` (#3) with the `X-Tenant-Id` interceptor
   - `JourneyService`
3. QuestionCard (#35), then the renderer for the kinds today's components cover.
4. The remaining components and kinds.
5. Studio: its preview uses the shared renderer.

## Verification

- **Parsers:** each response's valid fixture parses; an unknown `kind`, `type`, `rule` or `schemaVersion`, a wrong field type, or a missing field each fails.
- **Renderer:**
  - each `kind` renders its component
  - `personId` questions name the person
  - follow-ups open, and their answers leave `answersChange` when closed
  - validators attach by `rule`, with the message for each reason
  - Continue appears only when the screen is complete
- **`JourneyService`, with HTTP mocked:**
  - one request in flight per question, latest value wins
  - submit sends every open answer once
  - a 401 on submit leads to verification and resubmits the same answers
  - the timeout warning appears and "I need more time" extends the session
  - leaving with unsent answers asks first
  - each `ApiError` code reaches its screen
  - no answer values in logs
- **e2e:**
  - a synthetic journey on both synthetic firm hosts (tenancy, a11y, zoom)
  - a `tenantMismatch` gives the generic page
  - journey responses carry `Cache-Control: no-store`
- **Backend (for its repository):**
  - each host in the table resolves its tenant
  - a non-canonical host redirects 301 to the canonical host with the same path
  - a pending or suspended host gets 404
  - a write without a matching `Origin` gets 403
  - a closed-branch answer is dropped at submit
  - per-person answers never collide
  - tenant isolation

## Plan review findings

| # | Finding | Resolution |
| --- | --- | --- |
| 1 | Blocker: a withdrawn follow-up's answer stays on the server. | Resolved by removing drafts: nothing is stored before submit, and closed-branch answers are left out by the client and rejected by the backend. |
| 2 | Blocker: no per-person answers; answers keyed by library id. | Accepted: plan instance `id`, `libraryId`, `personId`. |
| 3 | No cache rule for journey responses. | Accepted: `Cache-Control: no-store, private`, plus an e2e check. |
| 4 | CSRF across firm subdomains. | Accepted: `__Host-` cookie, `Origin` and content-type checks. |
| 5 | Contradicts the tenancy canon (tenant header) and #3's theme. | Accepted: `X-Tenant-Id` header as the canon says; this theme supersedes #3's. |
| 6 | No adviser email on error pages; conflicts with the user's generic error page. | Accepted: a generic page when the firm or journey cannot be fetched; a calm page with `ApiError.adviser` only for `expired` and `submitted`. |
| 7 | Error shapes undefined; status codes collide. | Accepted: `ApiError` with one code per case. |
| 8 | `answersHash` undefined; retries can arrive out of order. | Resolved by removing drafts: there is one submit and nothing to reconcile. |
| 9 | One message cannot cover several reasons; UI copy has no source. | Accepted: `messages` by reason; `JourneyMeta.copy`. |
| 10 | Value formats unstated. | Accepted: stated on `AnswerValue` and `AnswerMatch`. |
| 11 | Option inputs cannot be validated. | Accepted: `validators` on the option input. |
| 12 | Renderer interface missing. | Accepted: a pure component with inputs and outputs. |
| 13 | Check your answers and loading unspecified. | Accepted: added by the client; JourneyShell states. |
| 14 | KISS cuts. | Accepted: dropped `Accept-Schema`, collapsed the card wrapper, `confirmFacts` and `goals` record changes only, one validation mechanism. |
| 15 | Specs do not trace to the invariants. | Accepted: added to Verification. |
