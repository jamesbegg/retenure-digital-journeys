# Questions engine: client contract, interfaces and renderer

Status: revised after the sixth review; implementation awaits the user's go-ahead (#6 is a stop point)
Risk: high (client answers, tenant isolation, the shape every journey depends on)
Plan review: six rounds (findings at the end)

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
- **Verification screen design.** The rules are set here (see Client authentication), but the screen goes through the journey-screen design gate.
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

## Client authentication (decided by the user)

A secure email link plus the respondent's date of birth. No accounts, no Cognito user, no phone needed.

**One respondent (user decision, pilot):** each invitation goes to exactly one household member, the respondent, who answers for the household. It is the lead by default; the adviser can choose another member in the studio's email step before sending. There is never a second recipient or a Cc. The link, the date of birth check, reminders and reissues all belong to the respondent.

**The link:**
- The email's button links to `https://<firm host>/start?utm_medium=email&utm_campaign=<templateId>#t=<token>`. The token is at least 256 bits of randomness and is stored only as a hash.
- **UTM (user decision):** `utm_medium=email` and `utm_campaign` set to the template id (`invite`, `reminder`, `reissue`), which tells initial emails from follow-ups.
  - Values are template names only, never a person, household or message id.
  - `utm_campaign` is allowlisted to `invite`, `reminder` and `reissue`, which are also the template ids. Any other value is dropped.
  - The app reads them and removes them from the address bar with the token. Recording them belongs to the drop-out ADR's first-party "journey opened" event; nothing is recorded before that ADR.
  - Email-provider click and open tracking is off: it rewrites links through the provider's domain.
- The token sits in the fragment (after `#`), so browsers never send it to the server, the CDN logs or other sites.
- **Links are records, never overwritten.** Each invitation has link records: `{ hash, issuedAt, state }`.
  - `state` is `pending` (minted for an email not yet confirmed sent), `live` (confirmed sent) or `superseded`.
  - A link expires 14 days after it is issued.
  - The invitation has its own expiry; a submitted invitation no longer expires.
- **Which links work:**
  - Any unexpired `pending` or `live` link verifies, because the client may already have a `pending` one in their inbox.
  - An expired link is still recognised for one purpose, asking for a reissue, until a newer link is confirmed `live`.
  - When a link is confirmed `live`, every older link becomes `superseded`, and a superseded link does nothing.
- The token can be used again until then: opening the email link again, or reverifying after the idle timeout, needs the token and the date of birth.
- **After submission** the link still verifies until its own 14 days run out (submission stops the invitation expiring, so nothing else ends it), but only to a receipt. Verification returns the `submitted` result (`submittedAt`, `submissionId`, the adviser's contact), and creates no session, plan or answers, so nothing can be submitted again. A client whose submit response was lost can still confirm their answers went through.

**Verifying:**
- The app reads the token and removes it from the address bar (`history.replaceState`), so it is not shared by copying the address or seen over a shoulder.
- It keeps the token in memory only, never in storage.
- The page asks for the respondent's date of birth with the TextField date control (`autocomplete="bday"`, paste allowed).
- Nothing happens when the page loads. Email security scanners open links automatically, and a `GET` must never use up a link or start a session.
- The client presses Continue, which sends `POST /client/verification` with `{ token, dateOfBirth }`.
- **On success,** the backend creates the session (a new session id, stored server-side and only as a hash), sets the cookie, and returns `VerificationResponse` with the `journeyId` it is bound to. The app sends that id as `X-Journey-Id` on the first journey load and every protected request after, so another tab verifying a different invitation in between cannot point this tab at the wrong household.
- **On failure,** the backend returns 401 `verification_failed`. The response is the same whether the token or the date was wrong, so nothing leaks.
- **Expired link, invitation still open (user decision):**
  - The backend creates an outbound message from the `reissue` template, addressed to the respondent's email on file and never to anyone else (see Outbound messages).
  - The template's send mode decides the response, and the date of birth is not checked:
    - **`auto`** (the pilot setting): the message is queued. The backend answers 409 `link_reissued`, and the page says "We're sending you a new link, it should be with you shortly." (user's copy).
    - **`approval`:** the message waits for the adviser in the studio. The backend answers 409 `link_requested`. The page copy for this case is to come from the user before that mode is used.
    - Neither message shows the address.
  - This happens only on Continue (a `POST`), never on page load, so an email scanner opening an old message cannot trigger it.
  - There is at most one reissue per invitation per 24 hours. Within that window the same response is shown but nothing new is created, so the inbox cannot be flooded.
    - **Tracked on the invitation row as `linkReissuedAt`,** pointing at its message.
    - One transactional write sets it and creates the outbound message. The write is conditional on there being no `reissue` message for this invitation in the last 24 hours that is `pendingApproval`, `queued`, `sending` or `sent`.
    - A `failed` or `rejected` one does not count, so a failed send never blocks recovery.
    - Two concurrent presses therefore create one message.
  - **The link is created when the email is sent, not before.** The message never records a link. The worker follows the backend's existing transport (`email-transport/send-due.ts`): lease the message and record the attempt.
  - **Check:** if the invitation is closed, or a link newer than this message's request is already `live`, mark the message `superseded` and send nothing.
  - **Reconcile first.** If the previous attempt's outcome is unknown, ask the provider before doing anything else, exactly as `send-due.ts` does:
    - **Accepted:** mark that attempt's link `live` (superseding older ones) and the message `sent`. Nothing new is minted.
    - **Refused, or never reached the provider:** go on to the next step.
    - **Still unknown (C2, user decision):** the message becomes `failed`, the minted link stays `pending` (a pending link still verifies), nothing is superseded, and the original expired link can still request a reissue.
  - **Mint and send:** add a new `pending` link (only its hash is stored) and hand the email, the only copy of the live link, to the provider.
    - **Accepted:** the link becomes `live` and the message `sent`.
    - **Refused:** the message becomes `failed`. Its `pending` link expires unused, and no other link is affected.
  - **What each failure leaves the client:**
    - **The provider refuses after the hash write:** nothing was overwritten. The original expired link is still recognised, so pressing Continue requests another reissue, and a `failed` message does not count towards the 24 hours.
    - **Accepted, but the response was lost:** reconciliation finds it accepted and marks it `live` without minting again, so the link in the client's inbox keeps working.
    - **Crash before sending:** the `pending` link was never sent. The retry finds no provider record, mints another `pending` link and sends it. The unsent one expires unused.
  - The message record, the approval preview and the timeline show a placeholder, never a live link.
  - A forwarded old link therefore never grants access. It only sends the client a fresh link.
- **Invitation expired:** a valid token and date of birth return the `expired` verification result, which carries the adviser's contact for the calm page. There is no session and no reissue. A wrong date returns `verification_failed` as usual.
- **Invitation submitted:** the `submitted` receipt result, as above. There is no reissue.
- **After 5 failures for one invitation,** the invitation locks and returns 403 `verification_locked`. The client sees a calm page asking them to contact their adviser. The adviser unlocks it by resending the invitation, which issues a new link.
- The endpoint is rate limited per IP address.
- The date of birth is compared on the server and never logged. It is the respondent's, which the adviser already holds.

**WCAG 3.3.8 (accessible authentication):** recalling a date of birth counts as a cognitive function test, so it passes through the criterion's "mechanism" route: the browser can fill or paste it for the client.
- Autofill: the three parts carry `bday-day`, `bday-month` and `bday-year`.
- Full-date paste: pasting a whole date ("5/3/1962", "05-03-1962" or "1962-03-05") into any of the three parts fills all three. This is a small TextField change, listed under this repository's work and tested.
- If either is missing on a supported browser, verification is not accessible and does not ship.

**Backend canon:** this needs a documented `client` audience next to `/management` (Cognito) and `/processes`. It should state:
- a Lambda authoriser for `/client/*` checks the session cookie against the session table, with result caching off in v1 (TTL 0), so a revoked or expired session is refused at once
- API Gateway's own denials (401 or 403 before a handler runs) do not go through `handleError()` and carry no application `reason`. The client's rule:
  1. An error body with a recognised `reason` is handled by that reason. This covers the public verification errors (`verification_failed`, `verification_locked`) and everything else from `handleError()`.
  2. Only when there is no recognised `reason`, and only on protected `/client/*` requests, does the status decide: 401 and 403 are both `session_expired` (C1, user decision), because the Lambda authoriser's denials arrive as 403. Every application 403 carries a reason.
  3. The public routes never use the status-only fallback. An unrecognised error there shows the generic error page.
- `/client/tenant` and `/client/verification` are the only public `client` routes
- those two routes carry the rate limits above

## Outbound messages (backend-owned, extensible)

Every journey email goes through one pipeline: invitations, reminders and link reissues, with fact finds to follow. Each goes to the respondent alone. Other platform emails keep their existing path; moving them would need its own contract. Retries and uncertain delivery follow the backend's existing transport (`src/services/email-transport/send-due.ts`).

- **Templates are controlled by Retenure.**
  - Each template has an id, a version, fixed copy with typed variables and a **send mode** (`auto` or `approval`).
  - The mode is set per template by Retenure, so any template or message can move between automatic and approved without code.
  - Per-firm overrides can be added later as an optional field.
- **An outbound message** is one record: `tenantId`, `householdId`, `templateId`, `templateVersion`, variables, recipient, `mode` copied from the template when it was created, `requestedBy` (`system`, `adviser` or `clientAction`), and a status:
  - `auto` starts at `queued`
  - `approval` starts at `pendingApproval`, then becomes `queued` when the adviser approves, or `rejected`
  - then `sending`, then `sent` or `failed`
- **Approval** happens in the studio, on the household. The adviser sees the rendered message and approves or rejects it.
- **Sending** uses the outbox worker described under Submitting: it leases the record, records the attempt and sends. Delivery is at least once, with the same narrow duplicate window.
- **Transparency for `auto` messages:**
  - The copy says it was sent automatically on behalf of the adviser and why ("…because your previous link had expired").
  - It carries no personal note from the adviser, and no answers or held data.
  - Every message, automatic or approved, appears on the household's timeline in the studio, marked automatic or approved, so an adviser is never surprised by an email in their name.
- **Sender (C5, user decision):** every client journey email goes from the servicing adviser's connected mailbox. There is no firm-identity sender for clients. With no live connection, the message is held for the adviser in the studio; a reissue still answers the client with `link_reissued`.
- **The invite (user decision, pilot):** we draft the subject and body; the adviser can edit both in the studio before approving. The "Start your check-in" button and its link are added by the platform, fixed at the end of the body, and cannot be edited or moved. The firm's greeting, the adviser's signature and the footer stay as the template sets them.
- **Pilot settings:** `reissue` is `auto`. The other templates are set when they are built. The backend contract (my-wealth-backend `docs/features/client-journeys.md`, PR #645) owns the pipeline's detail.

The client sees only two outcomes, `link_reissued` or `link_requested`. The rest is the backend's and the studio's.

## Sessions

These are client sessions, created by verification (see Client authentication): invitation-based, with no account and no Cognito user.

**Cookie and requests:**
- One host-only cookie: `__Host-ret_session`, `Secure`, `HttpOnly`, `SameSite=Strict`, `Path=/`, no `Domain`.
- The session is bound to one firm, one household, one invitation and one journey.
- Every `POST` requires:
  - `Content-Type: application/json`
  - an `Origin` exactly equal to `https://` plus the viewer host. No port is allowed; anything else gets 403.

**Headers the client sends:**
- `X-Tenant-Id`, from `TenantService`, on every call except `GET /client/tenant`, which is how the client learns it.
- `X-Journey-Id`, from the verification response, on every protected request: the first journey load, every later load, renewal and submit.

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
  - The page shows the date-of-birth step again, using the token held in memory. Answers stay in memory only. If the page was reloaded and the token is gone, the client opens the email link again.
  - Reverification must return the same tenant, invitation, journey id and plan. Then the client shows the answers again and lets the client continue or submit.
  - If any of those differ, the client discards the answers and loads the new journey fresh.
  - Nothing is lost while the tab stays open, and nothing sensitive stays visible while it is unattended.

## Endpoints

These follow the backend canon: Lambda handlers, a new `client` audience, singular route segments, and responses through `jsonResponse()` and `handleError()`.

| Method and path | Success | Notes |
| --- | --- | --- |
| `POST /client/verification` | 200 `VerificationResponse` | Body `{ token, dateOfBirth }`. Sets the session cookie. Public and rate limited. |
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
  - **Response lost, then the session expired:** the client verifies again with the token and date of birth. Verification returns the receipt-only `submitted` result, and the client shows the done screen when its `submissionId` matches. If the submission never landed, verification returns `open` and the client resends the same `submissionId` and payload.
- **Atomic.** One transaction stores the answers, the receipt and payload hash, the invitation's move to `submitted`, and the adviser's timeline entry. It is conditional on the invitation still being open.
- **No email on submission (user decision, pilot).** Nobody, the respondent included, is emailed a copy of the answers: it would arrive from the adviser's mailbox before the adviser had read it. The done screen tells the respondent their answers have gone to the adviser, and the adviser sees them in the studio. A client record of their answers is a later, separate decision.
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
  | 'verification_failed'   // 401 on verification: token or date of birth wrong (same response either way)
  | 'verification_locked'   // 403 on verification: too many failures; contact the adviser
  | 'link_reissued'         // 409 on verification: the link expired; a new one was sent (template mode auto)
  | 'link_requested'        // 409 on verification: the link expired; the adviser has been asked to send a new one (template mode approval)
  | 'forbidden_origin'      // 403
  | 'journey_expired';      // 409 on submission: the invitation expired before the submit (C6)
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

- **Asset URLs.** `logo.src`, `favicon` and `font.src` must be same-origin paths under `/t/<tenantId>/`. The parser rejects any other value, including other hosts, `data:` URLs and another tenant's prefix. Paths use only letters, digits, `.`, `_` and `-` in each segment, with no query string, so a new asset version gets a new path.
- **Colours** are `#rrggbb`, and `font.family` is letters, digits, spaces and hyphens only, because both reach CSS. The publish check enforces the same.
- **The parser checks a response against itself, not the host.** The client has no independent source for the tenant id, since custom domains map through the backend's host table. The backend's host resolution and `no-store` on the lookup are what stop one firm's theme reaching another firm's host.
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

type VerificationResponse =
  | { schemaVersion: 1; status: 'open'; journeyId: string; expiresAt: string }   // session created
  | {
      schemaVersion: 1;
      status: 'submitted';       // receipt only: no session, plan or answers
      journeyId: string;
      submittedAt: string;
      submissionId: string;
      adviser: AdviserContact;
    }
  | { schemaVersion: 1; status: 'expired'; journeyId: string; adviser: AdviserContact };   // no session

interface SessionResponse {      // renewal
  schemaVersion: 1;
  expiresAt: string;
}

interface JourneyMeta {
  id: string;
  type: 'annualCheckIn' | 'pulse' | 'followUp' | 'onboarding';
  title: string;               // "Your annual check-in"
  estimatedMinutes: number;
  copy: JourneyCopy;
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
  confirm: string;             // FactCard
  makeChange: string;
  confirmed: string;
  cancel: string;
  save: string;
  factNote: string;            // "Anything I should know?"
  contactLine: string;         // the adviser line under every screen
  urgentLink: string;
  sendTo: string;              // "Send to {adviser}"
  doneTitle: string;
  doneBody: string;
  alreadyCompletedTitle: string;
  alreadyCompletedBody: string;
  notYou: string;
  close: string;               // Modal
  emailAdviser: string;
  adviserLabel: string;
  progressValue: string;       // "Step {step} of {total}"
  moneyUnreadable: string;     // "Enter an amount in pounds, like 250 or 250.50"
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
  | (QuestionBase & { kind: 'yesNo'; yesLabel?: string; noLabel?: string; detail?: YesNoDetail })
  | (QuestionBase & { kind: 'radio'; options: QuestionOption[] })
  | (QuestionBase & { kind: 'checkbox'; options: QuestionOption[] })
  | (QuestionBase & { kind: 'text'; multiline: boolean; autocomplete?: string })
  | (QuestionBase & { kind: 'money' })
  | (QuestionBase & { kind: 'date'; autocomplete?: 'bday' })
  | (QuestionBase & { kind: 'confirmFacts'; facts: HeldFact[] })
  | (QuestionBase & { kind: 'goals'; goals: string[] });

interface YesNoDetail {          // one detail box, shown when the answer equals `when`
  when: boolean;
  label: string;               // "What is Sarah doing instead?"
  required: boolean;
}

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
  | { kind: 'radio'; value: string; input?: string }
  | { kind: 'checkbox'; values: string[]; inputs?: Record<string, string> }
  | { kind: 'yesNo'; value: boolean; detail?: string }      // detail only when value equals detail.when
  | { kind: 'text'; value: string }                         // trimmed
  | { kind: 'money'; value: string }                         // "1250.50": pounds, no symbol or commas
  | { kind: 'date'; value: string }                          // ISO YYYY-MM-DD
  | { kind: 'confirmFacts'; changed: { factId: string; newValue: string }[]; note?: string }   // empty: all still right
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
| `yesNo` | a `detail` answer only when the value equals `detail.when`; the client clears it when the value changes | `required`, `detail.required` | `true` or `false`, and the detail text when it is shown and required (field error code `detailRequired`) |
| `radio` | the option exists; an option input is checked by its own `required` and validators, and its error shows on that input | `required` | an option is chosen, and its required input, if any, is valid |
| `checkbox` | the options exist | `required` | at least one option is selected |
| `text` | the value is trimmed | `required`, validators | non-empty after trimming |
| `money` | TextField emits a readable amount or the raw text; `moneyAmount` is attached automatically to report unreadable text | `required`, `moneyAmount` min and max | a readable amount |
| `date` | TextField's `incompleteDate` and `invalidDate` | `required`, `dateOfBirth` | a complete, real date |
| `confirmFacts` | none | none (always required) | the client pressed Confirm, or Make a change and saved it (a changed fact may not be blank) |
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
- **Parsers** (`src/app/api/`): one per response, failing closed. Unknown fields are dropped and `null` counts as absent. `parseApiError` returns `null` for a body that is not the shared error shape (a gateway 401), so the caller decides from the status. A `radio` question needs at least three options (two belong to `yesNo`), validator bounds must leave a satisfiable range after defaults, timestamps must be real calendar times, and a `ParseError` names the field path but never a payload value.
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

- **v1 supports these question kinds:** `yesNo` (with an optional detail box), `radio` (3 to 6 options, at most one with an `input`), `text`, `money`, `date` and `confirmFacts` (1 to 8 facts with unique ids, always required, shown in a FactCard). The model writes every question from this catalogue, and the adviser's approval covers its words. Contact details are held facts, confirmed with `yesNo` plus a detail box, so there is no `email` or `tel` kind.
- **v1 supports one block type:** `card`.
- **v1 has no follow-ups.** They need QuestionCard (#35), so they arrive with it.
- **Enforced in three places:**
  - The #5 publish check refuses a v1 journey definition that uses anything else.
  - **When serving,** the backend checks the frozen plan before it answers `GET /client/journey`. A plan using an unsupported kind, block or `followUps` (one frozen before the check existed, for instance) gets 409 `unsupported_plan`, and the backend alerts the adviser. It never sends a plan the client cannot render.
  - **The v1 parser** accepts only the v1 kinds and block, and rejects any `followUps`. The wire types keep the full unions for later releases, but the parser enforces the v1 subset.
- **Later, together with their components:**
  - `checkbox` (#16)
  - `goals` (#32)
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
- No answers leave the platform by email.
- An expired session hides the journey. A mismatched reverification discards the in-memory answers.

## Failure behaviour

| Outcome | Client behaviour |
| --- | --- |
| `unknown_host`, tenant lookup fails | Neutral reset, then the generic error page. |
| Journey fetch or parse fails, `journey_mismatch` | Neutral reset, in-memory answers discarded, then the generic error page. |
| `session_expired`, or `expiresAt` passed | Hide the journey and show verification. Same journey: restore the answers. Different journey: discard them. |
| Journey `status: 'expired'` | A calm, branded page with the adviser's email. |
| Journey `status: 'submitted'` with this tab's `submissionId` | The done screen: the submission went through, and only its response was lost. |
| Journey `status: 'submitted'` with another id, or `already_submitted` | A calm page: "This check-in has already been completed. It was sent to <adviser first name> on <date>." Then "Wasn't you? If you didn't send these answers, contact <adviser first name> straight away.", with the adviser's contact. Only the respondent can complete it, so this is where they learn if someone else did. |
| `journey_expired` | Reload the journey, which now returns `status: 'expired'`, and show that calm page. |
| `submission_mismatch` | It should not happen, because the client never changes a payload under the same id. Show the generic error page and log the ids. |
| `unsupported_plan` | The generic error page, telling the client their adviser has been told. |
| `invalid_submission` | Go to the first question in `fieldErrors` with its message. If none of them is on screen, stay on Check your answers with a general message. |
| Submit network failure | Retry with the same `submissionId`. The answers are still in memory. |

## Decisions

### Confirmed by the user

- Question sets come from the backend per client; none are stored in the frontend.
- The model writes every question for the household from a fixed catalogue; the adviser's one-press approval covers its words. Retenure owns the service categories (decided in the backend lane, recorded in backend PR #645).
- C1, C2, C5 and C6 from the backend lane are accepted (2026-11-20).
- Branding is set once at start-up from the backend; if the firm or journey cannot be fetched, the client sees a generic error page.
- Submit once at the end, with no drafts.
- Pilot: one respondent per invitation, the lead by default and changeable by the adviser before sending; no second recipient or Cc; no email on submission.
- The renderer and question types live in `@retenure/ui`. Per-person answers come from plan instances with `personId`. This `TenantTheme` supersedes #3's draft.
- The session extends quietly on activity, and only an idle tab warns.
- Second review, simpler options:
  - no absolute session cap
  - one host per firm and no redirects in v1
  - no copy email of the answers (pilot: no email on submission at all)
  - screen-level behaviour belongs to the design gate
  - neutral link previews in v1

### Follow-up: measuring drop-out (an ADR first)

The ADR would cover first-party events only:
- `journeyOpened`, `sectionReached { sectionId }` and `submitted`, keyed by tenant and journey
- never an answer value
- reported per firm in the studio

It must decide retention, who can see the data, and whether identifiers are scoped to the invitation.

### Unresolved and blocking (backend owner)

1. **Client auth (decided: an invitation session, with the respondent's date of birth as the second step).** The backend owner adds the `client` audience to the backend canon, as described in Client authentication. The decision is made; this is the canon change still to land.
2. **Route namespace.** Confirm `/client/*` as the new audience.
3. **The edge secret mechanism, decided with infrastructure:** a secret header checked by the backend, or an API Gateway resource policy.

### Unresolved and non-blocking

- The full host lifecycle (several hosts, canonical switch, redirects, cache purge), to be planned in #3.

## Ownership, order and budget

| Owner | Work |
| --- | --- |
| Infrastructure (`my-wealth-infra`) | `X-Retenure-Host` set at the edge, the edge secret, alternate domain names and certificates for custom domains, `no-store` passed through |
| Backend (`my-wealth-backend`) | The outbound message pipeline (templates with send mode and sender, approval states, outbox worker, timeline entries); host table; the `client` audience, Lambda authoriser, verification with lockout and the session table; the five endpoints; the session, cookie and `Origin` rules; atomic idempotent submission; whole-batch validation; the single-respondent invitation; #5 publish checks including the v1 kinds |
| This repository | Interfaces with fixtures for the two synthetic firms; parsers; `TenantService` and its interceptor; `JourneyService`; RadioGroup `optionErrors`; TextField full-date paste; `QuestionRenderer` for the v1 kinds |
| Studio | Angular 22 upgrade, then the preview using the shared renderer |

**Order:** infrastructure and backend first. Then this repository's services and renderer. Journey screens go through the design gate, which is a stop point. The studio comes last.

**Budget for this repository:** about 12 files across `src/app/{api,tenant,journey,interfaces}`. Plus one renderer component with its spec and story, interface files in `projects/ui`, and the RadioGroup addition. **Replan** if it needs a production dependency, a new kind, browser storage or a change to an existing component's API beyond `optionErrors`.

## Verification

- **Parsers:** each response's valid fixture parses; an unknown `kind`, `type`, `rule` or `schemaVersion`, a foreign asset URL, a wrong type or a missing field each fails.
- **Renderer:**
  - each v1 kind renders its component
  - the per-kind completion rules, including optional blanks, `false` and whitespace
  - an option-input error appears on its field
  - the v1 parser rejects `checkbox`, `goals`, `notice`, `facts` and any `followUps`
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
  - another tab verifies a different invitation between this tab's verification and its first journey load: the load gets `journey_mismatch`
  - lost submit response, session expired, reverify: the receipt-only result leads to the done screen
  - pasting a full date into any date part fills all three, and autofill fills them
  - a lost submit response followed by an expired session leads to the done screen after reverifying
  - `journey_mismatch` shows the generic page
  - client responses carry `no-store`
  - opening the link (a `GET`) starts no session and uses nothing up
  - the token leaves the address bar after load
  - a wrong date of birth fails without saying which part was wrong
  - five failures lock the invitation
  - an expired link with an open invitation creates one `reissue` message per 24 hours, to the address on file: `auto` queues it and returns `link_reissued`; `approval` holds it and returns `link_requested`
  - a failed or rejected reissue does not block a new request
  - a delayed job whose request already has a newer `live` link, or whose invitation has closed, sends nothing
  - the provider refuses after the hash write: the message is `failed`, the original expired link still requests a reissue, and the 24-hour limit does not block it
  - accepted, but the response was lost: reconciliation marks it `live` without minting again, and the link in the inbox works
  - a crash before sending: the retry mints and sends a new `pending` link, and the unsent one never works
  - confirming a link `live` supersedes older links, and a superseded link does nothing
  - a wrong date of birth shows `verification_failed`, a locked invitation shows `verification_locked`, and a gateway 401 with no reason on a protected request shows the expired-session flow: three separate tests
  - an expired invitation with a valid token and date returns `expired` with the adviser's contact and no session
  - receipt-only verification works until the link's 14 days end, then stops
  - no live link is stored in a message record, preview or timeline entry
  - after submission, verification returns only the receipt and creates no session
  - the authoriser does not cache, and a gateway 401 leads to the expired-session flow
  - email links carry only `utm_medium=email` and an allowlisted `utm_campaign` (`invite`, `reminder`, `reissue`), other values are dropped, and provider tracking is off
  - an `auto` message states that it was automatic, carries no personal note, and appears on the household timeline
  - an expired link with a submitted or expired invitation reissues nothing
- **Backend (for its repository):**
  - a replay with the same id and payload returns the receipt
  - the same id with a different payload gets `submission_mismatch`
  - a different id gets `already_submitted`
  - the loser of two concurrent same-id requests gets the committed receipt
  - receipts never match across invitations
  - a frozen plan with an unsupported kind gets `unsupported_plan`
  - the tenant lookup carries `no-store`
  - a concurrent double submit accepts one
  - submission sends no email, and the invitation, reminders and reissues reach the respondent only
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

### Sixth review (`9f1e36c`)

| # | Finding | Resolution |
| --- | --- | --- |
| 1 | A failed reissue could leave the client without a usable link or a way to ask again. | Accepted: link records are never overwritten. A replacement is `pending` until confirmed `live`. The original expired link stays recognised for reissue until then. Uncertain sends are reconciled with the provider before minting. Tests for a refusal after the hash write and for an accepted send whose response was lost. |

### Fifth review (`1f364fc`)

| # | Finding | Resolution |
| --- | --- | --- |
| 1 | A reissue worker could invalidate the old link and lose the replacement. | Accepted at the time with generation ownership; replaced in the sixth review by link records that are never overwritten. |
| 2 | The gateway fallback overrode the verification errors. | Accepted: a recognised `reason` always wins; the status-only fallback applies only to protected requests with no recognised reason; three separate tests. |
| — | Verification for an expired invitation; receipt window. | Accepted: an `expired` verification result with the adviser's contact; receipts last until the link's 14 days end, because a submitted invitation does not expire. |
| — | UTM recording and spelling. | Accepted: recording stays in the telemetry ADR; `utm_campaign` allowlisted to `invite`, `reminder`, `reissue`; template id unified as `reissue`. |

### Fourth review (`83ba16e`)

| # | Finding | Resolution |
| --- | --- | --- |
| 1 | First journey load not bound to the verified invitation. | Accepted: verification returns `journeyId`, sent as `X-Journey-Id` on every protected request from the first load. Test added. |
| 2 | Receipt recovery unreachable after submission. | Accepted: the link verifies for the rest of its 14 days to a receipt-only result with no session. End-to-end test added. |
| 3 | Reissue link lifecycle across the queue. | Accepted: the link is created at send time; `linkGeneration` check before sending; no live link in records, previews or timeline; only waiting or sent messages count towards the 24 hours. Copy by the user. |
| 4 | Wrong WCAG 3.3.8 basis; paste into one part undefined. | Accepted: the "mechanism" route with `bday-*` autofill and full-date paste into any part (a TextField change). |
| — | Backend handoff: authoriser caching, gateway denials, email scope. | Accepted: authoriser TTL 0; any 401 is an expired session; pipeline scoped to journey emails and modelled on the existing transport. |

UTM was added by the user at the same time: `utm_medium=email` and `utm_campaign=<templateId>` only.

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
